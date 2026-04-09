import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, sql } from "drizzle-orm";

import { db } from "@ticket-app/db";
import {
  ecommerceStores,
  ecommerceOrders,
  contacts,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const ECOMMERCE_SYNC_QUEUE = `${env.QUEUE_PREFIX}:ecommerce-sync`;

export interface EcommerceSyncJobData {
  storeId: number;
}

export interface EcommerceOrderPayload {
  platformOrderId: string;
  orderNumber?: string;
  status: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  currency: string;
  subtotalAmount?: string;
  shippingAmount?: string;
  taxAmount?: string;
  totalAmount: string;
  discountAmount?: string;
  discountCodes?: string[];
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  lineItems?: Array<{
    productId: string;
    variantId?: string;
    name: string;
    quantity: number;
    price: string;
    sku?: string;
  }>;
  platformCreatedAt: Date;
  platformUpdatedAt: Date;
}

const ecommerceSyncQueue = new Queue(ECOMMERCE_SYNC_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addEcommerceSyncJob(storeId: number): Promise<void> {
  await ecommerceSyncQueue.add("sync-store", { storeId }, {
    jobId: `ecommerce-sync-${storeId}`,
  });
}

export async function scheduleEcommerceSyncPoll(intervalMs: number = 300000): Promise<void> {
  await ecommerceSyncQueue.add(
    "poll-all-stores",
    {},
    {
      repeat: { every: intervalMs },
      jobId: "ecommerce-sync-poll-recurring",
    }
  );
}

export function createEcommerceSyncWorker(): Worker {
  return new Worker(
    ECOMMERCE_SYNC_QUEUE,
    async (job: Job<EcommerceSyncJobData>) => {
      const { storeId } = job.data;

      const store = await db.query.ecommerceStores.findFirst({
        where: and(
          eq(ecommerceStores.id, storeId),
          eq(ecommerceStores.isActive, true),
          isNull(ecommerceStores.deletedAt)
        ),
      });

      if (!store) {
        return { synced: 0, success: true, skipped: true };
      }

      try {
        if (store.tokenExpiresAt && new Date(store.tokenExpiresAt) <= new Date()) {
          await refreshOAuthToken(store);
        }

        const orders = await pollEcommerceOrders(store);
        let synced = 0;

        for (const order of orders) {
          try {
            await processEcommerceOrder(store, order);
            synced++;
          } catch (err) {
            console.error(`Failed to process order ${order.platformOrderId}:`, err);
          }
        }

        await db
          .update(ecommerceStores)
          .set({
            lastSyncAt: new Date(),
            syncStatus: "completed",
            syncError: null,
            updatedAt: new Date(),
          })
          .where(eq(ecommerceStores.id, storeId));

        return { synced, success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";

        await db
          .update(ecommerceStores)
          .set({
            syncStatus: "failed",
            syncError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(ecommerceStores.id, storeId));

        console.error(`Ecommerce sync failed for store ${storeId}:`, err);
        throw new Error(`Ecommerce sync failed: ${errorMessage}`);
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );
}

async function refreshOAuthToken(store: typeof ecommerceStores.$inferSelect): Promise<void> {
  if (!store.refreshTokenEnc) {
    throw new Error("No refresh token available");
  }

  let newAccessToken: string;
  let newRefreshToken: string | undefined;
  let newExpiresAt: Date | undefined;

  switch (store.platform.toLowerCase()) {
    case "shopify": {
      const response = await fetch(`https://${store.shopDomain}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          refresh_token: store.refreshTokenEnc,
        }),
      });
      const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      newExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined;
      break;
    }
    case "woocommerce": {
      const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
      const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const response = await fetch(`${store.shopDomain}/wp-json/wc/v3/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: store.refreshTokenEnc,
        }),
      });
      const data = await response.json() as { access_token: string; refresh_token?: string };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      break;
    }
    case "salla": {
      const response = await fetch("https://api.salla.com.sa/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: store.refreshTokenEnc,
          client_id: process.env.SALLA_CLIENT_ID,
          client_secret: process.env.SALLA_CLIENT_SECRET,
        }),
      });
      const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      break;
    }
    case "zid": {
      const response = await fetch("https://api.zid.com/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: store.refreshTokenEnc,
          client_id: process.env.ZID_CLIENT_ID,
          client_secret: process.env.ZID_CLIENT_SECRET,
        }),
      });
      const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      break;
    }
    default:
      throw new Error(`Token refresh not supported for platform: ${store.platform}`);
  }

  await db
    .update(ecommerceStores)
    .set({
      accessTokenEnc: newAccessToken,
      refreshTokenEnc: newRefreshToken || store.refreshTokenEnc,
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(ecommerceStores.id, store.id));
}

async function pollEcommerceOrders(store: typeof ecommerceStores.$inferSelect): Promise<EcommerceOrderPayload[]> {
  switch (store.platform.toLowerCase()) {
    case "shopify":
      return pollShopifyOrders(store);
    case "woocommerce":
      return pollWooCommerceOrders(store);
    case "salla":
      return pollSallaOrders(store);
    case "zid":
      return pollZidOrders(store);
    default:
      console.warn(`Unsupported ecommerce platform: ${store.platform}`);
      return [];
  }
}

async function pollShopifyOrders(store: typeof ecommerceStores.$inferSelect): Promise<EcommerceOrderPayload[]> {
  try {
    const sinceDate = store.lastSyncAt 
      ? new Date(store.lastSyncAt.getTime() - 60000).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://${store.shopDomain}/admin/api/2024-01/orders.json?status=any&updated_at_min=${sinceDate}&limit=250`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": store.accessTokenEnc,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json() as { orders: any[] };
    const orders: EcommerceOrderPayload[] = [];

    for (const order of data.orders || []) {
      orders.push({
        platformOrderId: order.id.toString(),
        orderNumber: order.name,
        status: mapShopifyStatus(order.financial_status, order.fulfillment_status),
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        currency: order.currency,
        subtotalAmount: order.subtotal_price,
        shippingAmount: order.total_shipping,
        taxAmount: order.total_tax,
        totalAmount: order.total_price,
        discountAmount: order.total_discounts,
        discountCodes: order.discount_codes?.map((d: any) => d.code) || [],
        customerEmail: order.email,
        customerPhone: order.phone,
        customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}`.trim() : undefined,
        billingAddress: order.billing_address,
        shippingAddress: order.shipping_address,
        shippingMethod: order.shipping_lines?.[0]?.title,
        trackingNumber: order.fulfillments?.[0]?.tracking_number,
        trackingUrl: order.fulfillments?.[0]?.tracking_url,
        lineItems: order.line_items?.map((item: any) => ({
          productId: item.product_id?.toString() || "",
          variantId: item.variant_id?.toString(),
          name: item.title,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
        })) || [],
        platformCreatedAt: new Date(order.created_at),
        platformUpdatedAt: new Date(order.updated_at),
      });
    }

    return orders;
  } catch (err) {
    console.error(`Shopify poll error for store ${store.id}:`, err);
    throw err;
  }
}

async function pollWooCommerceOrders(store: typeof ecommerceStores.$inferSelect): Promise<EcommerceOrderPayload[]> {
  try {
    const sinceDate = store.lastSyncAt 
      ? new Date(store.lastSyncAt.getTime() - 60000).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const url = `${store.shopDomain}/wp-json/wc/v3/orders?after=${sinceDate}&per_page=100`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${store.accessTokenEnc}`,
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const data = await response.json() as any[];
    const orders: EcommerceOrderPayload[] = [];

    for (const order of data) {
      orders.push({
        platformOrderId: order.id.toString(),
        orderNumber: order.number,
        status: mapWooCommerceStatus(order.status),
        financialStatus: order.status,
        fulfillmentStatus: order.fulfillment_status,
        currency: order.currency,
        subtotalAmount: order.subtotal_total,
        shippingAmount: order.shipping_total,
        taxAmount: order.total_tax,
        totalAmount: order.total,
        discountAmount: order.discount_total,
        discountCodes: order.coupon_lines?.map((c: any) => c.code) || [],
        customerEmail: order.billing?.email,
        customerPhone: order.billing?.phone,
        customerName: order.billing?.first_name && order.billing?.last_name 
          ? `${order.billing.first_name} ${order.billing.last_name}`.trim()
          : undefined,
        billingAddress: order.billing,
        shippingAddress: order.shipping,
        shippingMethod: order.shipping_lines?.[0]?.method_title,
        trackingNumber: undefined,
        trackingUrl: undefined,
        lineItems: order.line_items?.map((item: any) => ({
          productId: item.product_id?.toString() || "",
          variantId: item.variation_id?.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
        })) || [],
        platformCreatedAt: new Date(order.date_created),
        platformUpdatedAt: new Date(order.date_modified),
      });
    }

    return orders;
  } catch (err) {
    console.error(`WooCommerce poll error for store ${store.id}:`, err);
    throw err;
  }
}

async function pollSallaOrders(store: typeof ecommerceStores.$inferSelect): Promise<EcommerceOrderPayload[]> {
  try {
    const sinceDate = store.lastSyncAt 
      ? new Date(store.lastSyncAt.getTime() - 60000).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.salla.com.sa/v2/orders?created_after=${sinceDate}&limit=100`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${store.accessTokenEnc}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Salla API error: ${response.status}`);
    }

    const data = await response.json() as { data: any[] };
    const orders: EcommerceOrderPayload[] = [];

    for (const order of data.data || []) {
      orders.push({
        platformOrderId: order.id.toString(),
        orderNumber: order.order_number,
        status: mapSallaStatus(order.status),
        financialStatus: order.payment?.status,
        fulfillmentStatus: order.status,
        currency: order.currency,
        subtotalAmount: order.subtotal,
        shippingAmount: order.shipping_cost,
        taxAmount: order.tax,
        totalAmount: order.total,
        discountAmount: order.discount,
        discountCodes: order.coupons?.map((c: any) => c.code) || [],
        customerEmail: order.customer?.email,
        customerPhone: order.customer?.mobile,
        customerName: order.customer?.name,
        billingAddress: order.address,
        shippingAddress: order.shipping_address,
        shippingMethod: order.shipping_method,
        trackingNumber: order.tracking_number,
        trackingUrl: order.tracking_url,
        lineItems: order.items?.map((item: any) => ({
          productId: item.product_id?.toString() || "",
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
        })) || [],
        platformCreatedAt: new Date(order.created_at),
        platformUpdatedAt: new Date(order.updated_at),
      });
    }

    return orders;
  } catch (err) {
    console.error(`Salla poll error for store ${store.id}:`, err);
    throw err;
  }
}

async function pollZidOrders(store: typeof ecommerceStores.$inferSelect): Promise<EcommerceOrderPayload[]> {
  try {
    const sinceDate = store.lastSyncAt 
      ? new Date(store.lastSyncAt.getTime() - 60000).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://api.zid.com/v1/orders?created_at_min=${sinceDate}&limit=100`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${store.accessTokenEnc}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Zid API error: ${response.status}`);
    }

    const data = await response.json() as { orders: any[] };
    const orders: EcommerceOrderPayload[] = [];

    for (const order of data.orders || []) {
      orders.push({
        platformOrderId: order.id.toString(),
        orderNumber: order.order_number,
        status: mapZidStatus(order.status),
        financialStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        currency: order.currency,
        subtotalAmount: order.subtotal,
        shippingAmount: order.shipping_cost,
        taxAmount: order.tax_amount,
        totalAmount: order.total,
        discountAmount: order.discount,
        discountCodes: order.coupons || [],
        customerEmail: order.customer?.email,
        customerPhone: order.customer?.phone,
        customerName: order.customer?.name,
        billingAddress: order.billing_address,
        shippingAddress: order.shipping_address,
        shippingMethod: order.shipping_method?.name,
        trackingNumber: order.shipment?.tracking_number,
        trackingUrl: order.shipment?.tracking_url,
        lineItems: order.items?.map((item: any) => ({
          productId: item.product_id?.toString() || "",
          variantId: item.variant_id?.toString(),
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku,
        })) || [],
        platformCreatedAt: new Date(order.created_at),
        platformUpdatedAt: new Date(order.updated_at),
      });
    }

    return orders;
  } catch (err) {
    console.error(`Zid poll error for store ${store.id}:`, err);
    throw err;
  }
}

function mapShopifyStatus(financialStatus: string, fulfillmentStatus: string): string {
  if (financialStatus === "refunded") return "refunded";
  if (financialStatus === "partially_refunded") return "partially_refunded";
  if (financialStatus === "voided") return "voided";
  if (fulfillmentStatus === "fulfilled") return "fulfilled";
  if (fulfillmentStatus === "partial") return "partially_fulfilled";
  if (financialStatus === "paid" && fulfillmentStatus === "unfulfilled") return "processing";
  return "pending";
}

function mapWooCommerceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "pending": "pending",
    "processing": "processing",
    "on-hold": "on_hold",
    "completed": "completed",
    "cancelled": "cancelled",
    "refunded": "refunded",
    "failed": "failed",
  };
  return statusMap[status] || status;
}

function mapSallaStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "pending": "pending",
    "confirmed": "confirmed",
    "shipped": "shipped",
    "delivered": "delivered",
    "cancelled": "cancelled",
    "returned": "returned",
  };
  return statusMap[status] || status;
}

function mapZidStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "pending": "pending",
    "paid": "paid",
    "processing": "processing",
    "shipped": "shipped",
    "delivered": "delivered",
    "cancelled": "cancelled",
    "returned": "returned",
    "refunded": "refunded",
  };
  return statusMap[status] || status;
}

async function processEcommerceOrder(
  store: typeof ecommerceStores.$inferSelect,
  order: EcommerceOrderPayload
): Promise<void> {
  const existingOrder = await db.query.ecommerceOrders.findFirst({
    where: and(
      eq(ecommerceOrders.storeId, store.id),
      eq(ecommerceOrders.platformOrderId, order.platformOrderId)
    ),
  });

  let contactId: number | undefined;

  if (order.customerEmail) {
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.email, order.customerEmail.toLowerCase()),
        eq(contacts.organizationId, store.organizationId),
        isNull(contacts.deletedAt)
      ),
    });
    contactId = contact?.id;
  }

  if (existingOrder) {
    await db
      .update(ecommerceOrders)
      .set({
        orderNumber: order.orderNumber,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        currency: order.currency,
        subtotalAmount: order.subtotalAmount,
        shippingAmount: order.shippingAmount,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        discountCodes: order.discountCodes || [],
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress,
        shippingMethod: order.shippingMethod,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        lineItems: order.lineItems || [],
        platformUpdatedAt: order.platformUpdatedAt,
        updatedAt: new Date(),
      })
      .where(eq(ecommerceOrders.id, existingOrder.id));
  } else {
    await db
      .insert(ecommerceOrders)
      .values({
        storeId: store.id,
        platformOrderId: order.platformOrderId,
        contactId,
        orderNumber: order.orderNumber,
        status: order.status,
        financialStatus: order.financialStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        currency: order.currency,
        subtotalAmount: order.subtotalAmount,
        shippingAmount: order.shippingAmount,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        discountCodes: order.discountCodes || [],
        customerEmail: order.customerEmail?.toLowerCase(),
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress,
        shippingMethod: order.shippingMethod,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        lineItems: order.lineItems || [],
        platformCreatedAt: order.platformCreatedAt,
        platformUpdatedAt: order.platformUpdatedAt,
      })
      .returning();
  }
}

export async function handleEcommerceWebhook(
  platform: string,
  shopDomain: string,
  payload: Record<string, any>
): Promise<void> {
  console.log(`Received ${platform} webhook for ${shopDomain}:`, JSON.stringify(payload));

  const store = await db.query.ecommerceStores.findFirst({
    where: and(
      eq(ecommerceStores.shopDomain, shopDomain),
      eq(ecommerceStores.platform, platform),
      eq(ecommerceStores.isActive, true)
    ),
  });

  if (!store) {
    console.warn(`Store not found for webhook: ${shopDomain}`);
    return;
  }

  switch (platform.toLowerCase()) {
    case "shopify": {
      const order = payload;
      if (order) {
        await processEcommerceOrder(store, {
          platformOrderId: order.id.toString(),
          orderNumber: order.name,
          status: mapShopifyStatus(order.financial_status, order.fulfillment_status),
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          currency: order.currency,
          subtotalAmount: order.subtotal_price,
          shippingAmount: order.total_shipping,
          taxAmount: order.total_tax,
          totalAmount: order.total_price,
          discountAmount: order.total_discounts,
          discountCodes: order.discount_codes?.map((d: any) => d.code) || [],
          customerEmail: order.email,
          customerPhone: order.phone,
          customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}`.trim() : undefined,
          billingAddress: order.billing_address,
          shippingAddress: order.shipping_address,
          shippingMethod: order.shipping_lines?.[0]?.title,
          trackingNumber: order.fulfillments?.[0]?.tracking_number,
          trackingUrl: order.fulfillments?.[0]?.tracking_url,
          lineItems: order.line_items?.map((item: any) => ({
            productId: item.product_id?.toString() || "",
            variantId: item.variant_id?.toString(),
            name: item.title,
            quantity: item.quantity,
            price: item.price,
            sku: item.sku,
          })) || [],
          platformCreatedAt: new Date(order.created_at),
          platformUpdatedAt: new Date(order.updated_at),
        });
      }
      break;
    }
    default:
      console.warn(`Webhook handler not implemented for platform: ${platform}`);
  }
}

export async function updateOrderStatus(
  platformOrderId: string,
  platform: string,
  shopDomain: string,
  status: string
): Promise<void> {
  const store = await db.query.ecommerceStores.findFirst({
    where: and(
      eq(ecommerceStores.shopDomain, shopDomain),
      eq(ecommerceStores.platform, platform)
    ),
  });

  if (!store) {
    console.warn(`Store not found for status update: ${shopDomain}`);
    return;
  }

  await db
    .update(ecommerceOrders)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ecommerceOrders.storeId, store.id),
        eq(ecommerceOrders.platformOrderId, platformOrderId)
      )
    );
}

export async function closeEcommerceSyncQueue(): Promise<void> {
  await ecommerceSyncQueue.close();
}

export { Worker, Job, Queue };
