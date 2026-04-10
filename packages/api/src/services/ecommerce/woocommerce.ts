import { db } from "@ticket-app/db";
import { ecommerceStores, ecommerceOrders } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

const WOOCOMMERCE_API_VERSION = "wc/v3";

interface WooCommerceConfig {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
}

interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  billing: WooCommerceAddress;
  shipping: WooCommerceAddress;
  line_items: WooCommerceLineItem[];
  shipping_lines: WooCommerceShippingLine[];
  total: string;
  subtotal: string;
  total_tax: string;
  discount_total: string;
  discount_codes: Array<{ code: string; discount: string }>;
  payment_method: string;
  transaction_id: string;
}

interface WooCommerceAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

interface WooCommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  price: string;
  sku: string;
  meta: Array<{ key: string; value: string }>;
}

interface WooCommerceShippingLine {
  id: number;
  method_id: string;
  method_title: string;
  total: string;
}

export async function getWooCommerceConfig(storeId: number): Promise<WooCommerceConfig | null> {
  const store = await db.query.ecommerceStores.findFirst({
    where: eq(ecommerceStores.id, storeId),
  });

  if (!store || store.platform !== "woocommerce" || !store.shopDomain) {
    return null;
  }

  const apiKey = store.accessTokenEnc;
  const apiSecret = store.refreshTokenEnc;

  if (!apiKey || !apiSecret) {
    return null;
  }

  return {
    domain: store.shopDomain,
    consumerKey: apiKey,
    consumerSecret: apiSecret,
  };
}

export async function wooCommerceApiRequest<T>(
  config: WooCommerceConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `https://${config.domain}/wp-json/${WOOCOMMERCE_API_VERSION}/${endpoint}`;

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WooCommerce API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function fetchWooCommerceOrders(
  config: WooCommerceConfig,
  params: {
    per_page?: number;
    after?: string;
    before?: string;
    status?: string;
  } = {},
): Promise<WooCommerceOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("per_page", String(params.per_page || 100));
  if (params.after) searchParams.set("after", params.after);
  if (params.before) searchParams.set("before", params.before);
  if (params.status) searchParams.set("status", params.status);

  const orders: WooCommerceOrder[] = [];
  let page = 1;
  const maxPages = 10;

  while (page <= maxPages) {
    searchParams.set("page", String(page));
    const response = await wooCommerceApiRequest<WooCommerceOrder[]>(
      config,
      `orders?${searchParams.toString()}`,
    );
    orders.push(...response);
    if (response.length < (params.per_page || 100)) break;
    page++;
  }

  return orders;
}

export async function fetchWooCommerceOrder(
  config: WooCommerceConfig,
  orderId: number,
): Promise<WooCommerceOrder | null> {
  try {
    const orders = await wooCommerceApiRequest<WooCommerceOrder[]>(config, `orders/${orderId}`);
    return orders[0] || null;
  } catch {
    return null;
  }
}

export function transformWooCommerceOrder(
  storeId: number,
  wooOrder: WooCommerceOrder,
): Omit<typeof ecommerceOrders.$inferInsert, "id" | "uuid" | "createdAt" | "updatedAt"> {
  const lineItems = wooOrder.line_items.map((item) => ({
    productId: String(item.product_id),
    variantId: String(item.variation_id),
    title: item.name,
    variantTitle: item.meta.map((m) => `${m.key}: ${m.value}`).join(", ") || null,
    quantity: item.quantity,
    price: item.price,
    sku: item.sku,
  }));

  const shippingLine = wooOrder.shipping_lines?.[0];

  const billingAddress = {
    firstName: wooOrder.billing.first_name,
    lastName: wooOrder.billing.last_name,
    company: wooOrder.billing.company,
    address1: wooOrder.billing.address_1,
    address2: wooOrder.billing.address_2 || null,
    city: wooOrder.billing.city,
    province: wooOrder.billing.state,
    country: wooOrder.billing.country,
    zip: wooOrder.billing.postcode,
    phone: wooOrder.billing.phone,
    email: wooOrder.billing.email,
  };

  const shippingAddress = {
    firstName: wooOrder.shipping.first_name,
    lastName: wooOrder.shipping.last_name,
    company: wooOrder.shipping.company,
    address1: wooOrder.shipping.address_1,
    address2: wooOrder.shipping.address_2 || null,
    city: wooOrder.shipping.city,
    province: wooOrder.shipping.state,
    country: wooOrder.shipping.country,
    zip: wooOrder.shipping.postcode,
    phone: wooOrder.shipping.phone,
    email: null,
  };

  return {
    storeId,
    platformOrderId: String(wooOrder.id),
    orderNumber: wooOrder.number,
    status: wooOrder.status,
    financialStatus: wooOrder.status,
    fulfillmentStatus: null,
    currency: "SAR",
    subtotalAmount: wooOrder.subtotal,
    shippingAmount: shippingLine?.total || "0",
    taxAmount: wooOrder.total_tax,
    totalAmount: wooOrder.total,
    discountAmount: wooOrder.discount_total,
    discountCodes: wooOrder.discount_codes,
    customerEmail: wooOrder.billing.email?.toLowerCase() || null,
    customerPhone: wooOrder.billing.phone?.replace(/\D/g, "") || null,
    customerName:
      [wooOrder.billing.first_name, wooOrder.billing.last_name].filter(Boolean).join(" ") || null,
    billingAddress,
    shippingAddress,
    shippingMethod: shippingLine?.method_title || null,
    trackingNumber: null,
    trackingUrl: null,
    lineItems,
    platformCreatedAt: new Date(wooOrder.date_created),
    platformUpdatedAt: new Date(wooOrder.date_modified),
  };
}

export async function syncWooCommerceStoreOrders(
  storeId: number,
  sinceDate?: Date,
): Promise<{ synced: number; errors: string[] }> {
  const config = await getWooCommerceConfig(storeId);
  if (!config) {
    return { synced: 0, errors: ["Invalid store configuration"] };
  }

  const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const orders = await fetchWooCommerceOrders(config, {
      after: since.toISOString(),
      status: "any",
    });

    let synced = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        const existing = await db.query.ecommerceOrders.findFirst({
          where: eq(ecommerceOrders.platformOrderId, String(order.id)),
        });

        const transformed = transformWooCommerceOrder(storeId, order);

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
      errors: [err instanceof Error ? err.message : "Failed to fetch orders from WooCommerce"],
    };
  }
}
