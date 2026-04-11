import { db } from "@ticket-app/db";
import { ecommerceStores, ecommerceOrders } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

const SHOPIFY_API_VERSION = "2024-01";

interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
}

interface ShopifyOrder {
  id: string;
  order_number: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_shipping_price_set: {
    shop_money: { amount: string };
  };
  discount_codes: Array<{ code: string; amount: string }>;
  shipping_address: ShopifyAddress | null;
  billing_address: ShopifyAddress | null;
  line_items: ShopifyLineItem[];
  fulfillments: ShopifyFulfillment[];
  financial_status: string;
  fulfillment_status: string | null;
}

interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string | null;
}

interface ShopifyLineItem {
  id: string;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;
  sku: string | null;
  product_id: string;
  variant_id: string;
}

interface ShopifyFulfillment {
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
}

export async function getShopifyConfig(storeId: number): Promise<ShopifyConfig | null> {
  const store = await db.query.ecommerceStores.findFirst({
    where: eq(ecommerceStores.id, storeId),
  });

  if (!store || store.platform !== "shopify" || !store.accessTokenEnc || !store.shopDomain) {
    return null;
  }

  return {
    shopDomain: store.shopDomain,
    accessToken: store.accessTokenEnc,
  };
}

export async function shopifyApiRequest<T>(
  config: ShopifyConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `https://${config.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${error}`);
  }

  return response.json() as T;
}

export async function fetchShopifyOrders(
  config: ShopifyConfig,
  params: {
    limit?: number;
    created_at_min?: string;
    updated_at_min?: string;
    status?: string;
  } = {},
): Promise<ShopifyOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit || 250));
  if (params.created_at_min) searchParams.set("created_at_min", params.created_at_min);
  if (params.updated_at_min) searchParams.set("updated_at_min", params.updated_at_min);
  if (params.status) searchParams.set("status", params.status);

  const data = await shopifyApiRequest<{ orders: ShopifyOrder[] }>(
    config,
    `orders.json?${searchParams.toString()}`,
  );

  return data.orders;
}

export async function fetchShopifyOrder(
  config: ShopifyConfig,
  orderId: string,
): Promise<ShopifyOrder | null> {
  try {
    const data = await shopifyApiRequest<{ order: ShopifyOrder }>(config, `orders/${orderId}.json`);
    return data.order;
  } catch {
    return null;
  }
}

export function transformShopifyOrder(
  storeId: number,
  shopifyOrder: ShopifyOrder,
): Omit<typeof ecommerceOrders.$inferInsert, "id" | "uuid" | "createdAt" | "updatedAt"> {
  const lineItems = shopifyOrder.line_items.map((item) => ({
    productId: item.product_id,
    variantId: item.variant_id,
    title: item.title,
    variantTitle: item.variant_title,
    quantity: item.quantity,
    price: item.price,
    sku: item.sku,
  }));

  const fulfillments = shopifyOrder.fulfillments || [];
  const lastFulfillment = fulfillments[fulfillments.length - 1];

  const billingAddress = shopifyOrder.billing_address
    ? {
        firstName: shopifyOrder.billing_address.first_name,
        lastName: shopifyOrder.billing_address.last_name,
        address1: shopifyOrder.billing_address.address1,
        address2: shopifyOrder.billing_address.address2,
        city: shopifyOrder.billing_address.city,
        province: shopifyOrder.billing_address.province,
        country: shopifyOrder.billing_address.country,
        zip: shopifyOrder.billing_address.zip,
        phone: shopifyOrder.billing_address.phone,
      }
    : null;

  const shippingAddress = shopifyOrder.shipping_address
    ? {
        firstName: shopifyOrder.shipping_address.first_name,
        lastName: shopifyOrder.shipping_address.last_name,
        address1: shopifyOrder.shipping_address.address1,
        address2: shopifyOrder.shipping_address.address2,
        city: shopifyOrder.shipping_address.city,
        province: shopifyOrder.shipping_address.province,
        country: shopifyOrder.shipping_address.country,
        zip: shopifyOrder.shipping_address.zip,
        phone: shopifyOrder.shipping_address.phone,
      }
    : null;

  return {
    storeId,
    platformOrderId: shopifyOrder.id,
    orderNumber: shopifyOrder.name,
    status: shopifyOrder.fulfillment_status || "unfulfilled",
    financialStatus: shopifyOrder.financial_status,
    fulfillmentStatus: shopifyOrder.fulfillment_status,
    currency: "SAR",
    subtotalAmount: shopifyOrder.subtotal_price,
    shippingAmount: shopifyOrder.total_shipping_price_set.shop_money.amount,
    taxAmount: shopifyOrder.total_tax,
    totalAmount: shopifyOrder.total_price,
    discountAmount: shopifyOrder.discount_codes
      .reduce((sum, code) => sum + parseFloat(code.amount || "0"), 0)
      .toString(),
    discountCodes: shopifyOrder.discount_codes,
    customerEmail: shopifyOrder.email?.toLowerCase() || null,
    customerPhone: shopifyOrder.phone?.replace(/\D/g, "") || null,
    customerName:
      [shopifyOrder.shipping_address?.first_name, shopifyOrder.shipping_address?.last_name]
        .filter(Boolean)
        .join(" ") || null,
    billingAddress,
    shippingAddress,
    shippingMethod: null,
    trackingNumber: lastFulfillment?.tracking_number || null,
    trackingUrl: lastFulfillment?.tracking_url || null,
    lineItems,
    platformCreatedAt: new Date(shopifyOrder.created_at),
    platformUpdatedAt: new Date(shopifyOrder.updated_at),
  };
}

export async function syncShopifyStoreOrders(
  storeId: number,
  sinceDate?: Date,
): Promise<{ synced: number; errors: string[] }> {
  const config = await getShopifyConfig(storeId);
  if (!config) {
    return { synced: 0, errors: ["Invalid store configuration"] };
  }

  const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const orders = await fetchShopifyOrders(config, {
      created_at_min: since.toISOString(),
      status: "any",
    });

    let synced = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        const existing = await db.query.ecommerceOrders.findFirst({
          where: eq(ecommerceOrders.platformOrderId, order.id),
        });

        const transformed = transformShopifyOrder(storeId, order);

        if (existing) {
          await db
            .update(ecommerceOrders)
            .set({
              ...transformed,
              updatedAt: new Date(),
            })
            .where(eq(ecommerceOrders.id, existing.id));
        } else {
          await db.insert(ecommerceOrders).values(transformed);
        }
        synced++;
      } catch (err) {
        errors.push(`Order ${order.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return { synced, errors };
  } catch (err) {
    return {
      synced: 0,
      errors: [err instanceof Error ? err.message : "Failed to fetch orders from Shopify"],
    };
  }
}
