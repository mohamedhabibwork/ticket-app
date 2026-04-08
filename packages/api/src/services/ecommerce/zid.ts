import { db } from "@ticket-app/db";
import { ecommerceStores, ecommerceOrders } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

const ZID_API_VERSION = "v2";

interface ZidConfig {
  shopDomain: string;
  accessToken: string;
}

interface ZidOrder {
  id: number;
  order_number: string;
  merchant_order_id: string;
  status: ZidOrderStatus;
 payment: ZidPayment;
  shipping: ZidShipping;
  items: ZidOrderItem[];
  created_at: string;
  updated_at: string;
  item_count: number;
  totals: ZidTotals;
  customer: ZidCustomer;
  addresses: {
    billing: ZidAddress;
    shipping: ZidAddress;
  };
  notes: string | null;
  extra_fields: Array<{ key: string; value: string }>;
}

type ZidOrderStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "in_progress"
  | "finished"
  | "on_hold"
  | "cancelled"
  | "returned";

interface ZidPayment {
  status: ZidPaymentStatus;
  method: string;
  transaction_id: string | null;
  paid_at: string | null;
}

type ZidPaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";

interface ZidShipping {
  status: ZidShippingStatus;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
}

type ZidShippingStatus = "pending" | "shipped" | "delivered" | "returned";

interface ZidOrderItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: string;
  total_price: string;
  image: string | null;
  options: Array<{ key: string; value: string }>;
}

interface ZidTotals {
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
}

interface ZidCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string | null;
  created_at: string;
}

interface ZidAddress {
  first_name: string;
  last_name: string;
  description: string;
  city: string;
  city_id: number;
  region: string;
  country: string;
  postal_code: string | null;
  phone: string;
}

export async function getZidConfig(storeId: number): Promise<ZidConfig | null> {
  const store = await db.query.ecommerceStores.findFirst({
    where: eq(ecommerceStores.id, storeId),
  });

  if (!store || store.platform !== "zid" || !store.accessTokenEnc || !store.shopDomain) {
    return null;
  }

  return {
    shopDomain: store.shopDomain,
    accessToken: store.accessTokenEnc,
  };
}

export async function zidApiRequest<T>(
  config: ZidConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://${config.shopDomain}/api/${ZID_API_VERSION}/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zid API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function fetchZidOrders(
  config: ZidConfig,
  params: {
    limit?: number;
    page?: number;
    sort?: string;
    status?: ZidOrderStatus;
  } = {}
): Promise<ZidOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit || 100));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.status) searchParams.set("status", params.status);

  const data = await zidApiRequest<{ data: ZidOrder[] }>(
    config,
    `orders?${searchParams.toString()}`
  );

  return data.data || [];
}

export async function fetchZidOrder(
  config: ZidConfig,
  orderId: string
): Promise<ZidOrder | null> {
  try {
    const data = await zidApiRequest<{ data: ZidOrder }>(
      config,
      `orders/${orderId}`
    );
    return data.data || null;
  } catch {
    return null;
  }
}

export function transformZidOrder(
  storeId: number,
  zidOrder: ZidOrder
): Omit<typeof ecommerceOrders.$inferInsert, "id" | "uuid" | "createdAt" | "updatedAt"> {
  const lineItems = zidOrder.items.map((item) => ({
    productId: String(item.product_id),
    variantId: item.variant_id ? String(item.variant_id) : null,
    title: item.name,
    variantTitle: item.options.map((o) => `${o.key}: ${o.value}`).join(", ") || null,
    quantity: item.quantity,
    price: item.unit_price,
    sku: item.sku,
    imageUrl: item.image,
  }));

  const billingAddress = {
    firstName: zidOrder.addresses.billing.first_name,
    lastName: zidOrder.addresses.billing.last_name,
    description: zidOrder.addresses.billing.description,
    city: zidOrder.addresses.billing.city,
    country: zidOrder.addresses.billing.country,
    postalCode: zidOrder.addresses.billing.postal_code,
    phone: zidOrder.addresses.billing.phone,
    region: zidOrder.addresses.billing.region,
  };

  const shippingAddress = {
    firstName: zidOrder.addresses.shipping.first_name,
    lastName: zidOrder.addresses.shipping.last_name,
    description: zidOrder.addresses.shipping.description,
    city: zidOrder.addresses.shipping.city,
    country: zidOrder.addresses.shipping.country,
    postalCode: zidOrder.addresses.shipping.postal_code,
    phone: zidOrder.addresses.shipping.phone,
    region: zidOrder.addresses.shipping.region,
  };

  const statusMap: Record<ZidOrderStatus, string> = {
    pending: "pending",
    under_review: "processing",
    approved: "processing",
    in_progress: "processing",
    finished: "delivered",
    on_hold: "on_hold",
    cancelled: "cancelled",
    returned: "refunded",
  };

  return {
    storeId,
    platformOrderId: String(zidOrder.id),
    orderNumber: zidOrder.merchant_order_id || zidOrder.order_number,
    status: statusMap[zidOrder.status] || zidOrder.status,
    financialStatus: zidOrder.payment.status,
    fulfillmentStatus: zidOrder.shipping.status,
    currency: zidOrder.totals.currency,
    subtotalAmount: zidOrder.totals.subtotal,
    shippingAmount: zidOrder.totals.shipping,
    taxAmount: zidOrder.totals.tax,
    totalAmount: zidOrder.totals.total,
    discountAmount: zidOrder.totals.discount,
    discountCodes: [],
    customerEmail: zidOrder.customer.email?.toLowerCase() || null,
    customerPhone: zidOrder.customer.phone?.replace(/\D/g, "") || null,
    customerName: [zidOrder.customer.first_name, zidOrder.customer.last_name]
      .filter(Boolean)
      .join(" ") || null,
    billingAddress,
    shippingAddress,
    shippingMethod: zidOrder.shipping.carrier,
    trackingNumber: zidOrder.shipping.tracking_number,
    trackingUrl: zidOrder.shipping.tracking_url,
    lineItems,
    platformCreatedAt: new Date(zidOrder.created_at),
    platformUpdatedAt: new Date(zidOrder.updated_at),
  };
}

export async function syncZidStoreOrders(
  storeId: number,
  sinceDate?: Date
): Promise<{ synced: number; errors: string[] }> {
  const config = await getZidConfig(storeId);
  if (!config) {
    return { synced: 0, errors: ["Invalid store configuration"] };
  }

  try {
    const orders = await fetchZidOrders(config, {
      limit: 100,
      sort: "created_at",
    });

    const sinceTimestamp = sinceDate?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const relevantOrders = orders.filter(
      (order) => new Date(order.created_at).getTime() >= sinceTimestamp
    );

    let synced = 0;
    const errors: string[] = [];

    for (const order of relevantOrders) {
      try {
        const existing = await db.query.ecommerceOrders.findFirst({
          where: eq(ecommerceOrders.platformOrderId, String(order.id)),
        });

        const transformed = transformZidOrder(storeId, order);

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
        errors.push(
          `Order ${order.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return { synced, errors };
  } catch (err) {
    return {
      synced: 0,
      errors: [err instanceof Error ? err.message : "Failed to fetch orders from Zid"],
    };
  }
}
