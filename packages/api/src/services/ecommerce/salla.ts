import { db } from "@ticket-app/db";
import { ecommerceStores, ecommerceOrders } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

const SALLA_API_VERSION = "v2";

interface SallaConfig {
  shopDomain: string;
  accessToken: string;
}

interface SallaOrder {
  id: number;
  order_id: string;
  reference_id: string;
  status: SallaOrderStatus;
  payment: SallaPayment;
  shippment: SallaShipment;
  order_items: SallaOrderItem[];
  timeline: SallaTimeline[];
  created_at: string;
  updated_at: string;
  item_count: number;
 total: SallaMoney;
  subtotal: SallaMoney;
  tax: SallaMoney;
  discount: SallaMoney;
  shipping: SallaMoney;
  customer: SallaCustomer;
  addresses: {
    billing: SallaAddress;
    shipping: SallaAddress;
  };
}

type SallaOrderStatus =
  | "pending"
  | "confirmed"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

interface SallaPayment {
  status: string;
  method: string;
  transaction_id: string | null;
}

interface SallaShipment {
 status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
}

interface SallaOrderItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  name: string;
  sku: string | null;
  quantity: number;
  price: SallaMoney;
  image: string | null;
  options: Array<{ key: string; value: string }>;
}

interface SallaMoney {
  amount: string;
  currency: string;
}

interface SallaTimeline {
  key: string;
  value: string;
  created_at: string;
}

interface SallaCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string | null;
  created_at: string;
}

interface SallaAddress {
  first_name: string;
  last_name: string;
  description: string;
  city: string;
  country: string;
  postal_code: string | null;
  phone: string;
}

export async function getSallaConfig(storeId: number): Promise<SallaConfig | null> {
  const store = await db.query.ecommerceStores.findFirst({
    where: eq(ecommerceStores.id, storeId),
  });

  if (!store || store.platform !== "salla" || !store.accessTokenEnc || !store.shopDomain) {
    return null;
  }

  return {
    shopDomain: store.shopDomain,
    accessToken: store.accessTokenEnc,
  };
}

export async function sallaApiRequest<T>(
  config: SallaConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://${config.shopDomain}/api/${SALLA_API_VERSION}/${endpoint}`;

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
    throw new Error(`Salla API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function fetchSallaOrders(
  config: SallaConfig,
  params: {
    limit?: number;
    page?: number;
    sort?: string;
    status?: SallaOrderStatus;
  } = {}
): Promise<SallaOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(params.limit || 100));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.status) searchParams.set("status", params.status);

  const data = await sallaApiRequest<{ data: SallaOrder[] }>(
    config,
    `orders?${searchParams.toString()}`
  );

  return data.data || [];
}

export async function fetchSallaOrder(
  config: SallaConfig,
  orderId: string
): Promise<SallaOrder | null> {
  try {
    const data = await sallaApiRequest<{ data: SallaOrder }>(
      config,
      `orders/${orderId}`
    );
    return data.data || null;
  } catch {
    return null;
  }
}

export function transformSallaOrder(
  storeId: number,
  sallaOrder: SallaOrder
): Omit<typeof ecommerceOrders.$inferInsert, "id" | "uuid" | "createdAt" | "updatedAt"> {
  const lineItems = sallaOrder.order_items.map((item) => ({
    productId: String(item.product_id),
    variantId: item.variant_id ? String(item.variant_id) : null,
    title: item.name,
    variantTitle: item.options.map((o) => `${o.key}: ${o.value}`).join(", ") || null,
    quantity: item.quantity,
    price: item.price.amount,
    sku: item.sku,
    imageUrl: item.image,
  }));

  const billingAddress = {
    firstName: sallaOrder.addresses.billing.first_name,
    lastName: sallaOrder.addresses.billing.last_name,
    description: sallaOrder.addresses.billing.description,
    city: sallaOrder.addresses.billing.city,
    country: sallaOrder.addresses.billing.country,
    postalCode: sallaOrder.addresses.billing.postal_code,
    phone: sallaOrder.addresses.billing.phone,
  };

  const shippingAddress = {
    firstName: sallaOrder.addresses.shipping.first_name,
    lastName: sallaOrder.addresses.shipping.last_name,
    description: sallaOrder.addresses.shipping.description,
    city: sallaOrder.addresses.shipping.city,
    country: sallaOrder.addresses.shipping.country,
    postalCode: sallaOrder.addresses.shipping.postal_code,
    phone: sallaOrder.addresses.shipping.phone,
  };

  const statusMap: Record<SallaOrderStatus, string> = {
    pending: "pending",
    confirmed: "processing",
    ready_to_ship: "shipped",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    returned: "refunded",
  };

  return {
    storeId,
    platformOrderId: String(sallaOrder.id),
    orderNumber: sallaOrder.reference_id || sallaOrder.order_id,
    status: statusMap[sallaOrder.status] || sallaOrder.status,
    financialStatus: sallaOrder.payment.status,
    fulfillmentStatus: sallaOrder.shippment.status,
    currency: sallaOrder.total.currency,
    subtotalAmount: sallaOrder.subtotal.amount,
    shippingAmount: sallaOrder.shipping.amount,
    taxAmount: sallaOrder.tax.amount,
    totalAmount: sallaOrder.total.amount,
    discountAmount: sallaOrder.discount.amount,
    discountCodes: [],
    customerEmail: sallaOrder.customer.email?.toLowerCase() || null,
    customerPhone: sallaOrder.customer.phone?.replace(/\D/g, "") || null,
    customerName: [sallaOrder.customer.first_name, sallaOrder.customer.last_name]
      .filter(Boolean)
      .join(" ") || null,
    billingAddress,
    shippingAddress,
    shippingMethod: sallaOrder.shippment.carrier,
    trackingNumber: sallaOrder.shippment.tracking_number,
    trackingUrl: sallaOrder.shippment.tracking_url,
    lineItems,
    platformCreatedAt: new Date(sallaOrder.created_at),
    platformUpdatedAt: new Date(sallaOrder.updated_at),
  };
}

export async function syncSallaStoreOrders(
  storeId: number,
  sinceDate?: Date
): Promise<{ synced: number; errors: string[] }> {
  const config = await getSallaConfig(storeId);
  if (!config) {
    return { synced: 0, errors: ["Invalid store configuration"] };
  }

  try {
    const orders = await fetchSallaOrders(config, {
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

        const transformed = transformSallaOrder(storeId, order);

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
      errors: [err instanceof Error ? err.message : "Failed to fetch orders from Salla"],
    };
  }
}
