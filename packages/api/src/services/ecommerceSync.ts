import { db } from "@ticket-app/db";
import { ecommerceOrders } from "@ticket-app/db/schema";
import { and, eq, isNull, like, or } from "drizzle-orm";
import { syncShopifyStoreOrders, getShopifyOrders } from "./ecommerce/shopify";
import { syncWooCommerceStoreOrders, getWooCommerceOrders } from "./ecommerce/woocommerce";
import { syncSallaStoreOrders, getSallaOrders } from "./ecommerce/salla";
import { syncZidStoreOrders, getZidOrders } from "./ecommerce/zid";

export interface OrderFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SearchOrderFilters extends OrderFilters {
  platform?: string;
}

export async function fetchStoreOrders(
  storeId: number,
  options: OrderFilters = {},
): Promise<unknown[]> {
  const store = await db.query.ecommerceStores.findFirst({
    where: and(eq(ecommerceStores.id, storeId), isNull(ecommerceStores.deletedAt)),
  });

  if (!store) {
    throw new Error("Store not found");
  }

  const { status, limit = 50, offset = 0 } = options;

  switch (store.platform.toLowerCase()) {
    case "shopify":
      return getShopifyOrders(store, { status, limit, offset });
    case "woocommerce":
      return getWooCommerceOrders(store, { status, limit, offset });
    case "salla":
      return getSallaOrders(store, { status, limit, offset });
    case "zid":
      return getZidOrders(store, { status, limit, offset });
    default:
      throw new Error(`Unsupported platform: ${store.platform}`);
  }
}

export async function searchOrdersAcrossStores(
  organizationId: number,
  query: string,
  options: SearchOrderFilters = {},
): Promise<unknown[]> {
  const { platform, limit = 50 } = options;

  // Search in local database first
  const conditions = [
    eq(ecommerceOrders.organizationId, organizationId),
    isNull(ecommerceOrders.deletedAt),
    or(
      like(ecommerceOrders.customerEmail, `%${query}%`),
      like(ecommerceOrders.customerName, `%${query}%`),
      like(ecommerceOrders.orderNumber, `%${query}%`),
    ),
  ];

  if (platform) {
    conditions.push(eq(ecommerceOrders.platform, platform));
  }

  const localOrders = await db
    .select()
    .from(ecommerceOrders)
    .where(and(...conditions))
    .limit(limit);

  return localOrders;
}

export async function syncStoreOrders(
  storeId: number,
  forceFullSync = false,
): Promise<{ success: boolean; syncedCount: number }> {
  const store = await db.query.ecommerceStores.findFirst({
    where: and(eq(ecommerceStores.id, storeId), isNull(ecommerceStores.deletedAt)),
  });

  if (!store) {
    throw new Error("Store not found");
  }

  let syncedCount = 0;

  switch (store.platform.toLowerCase()) {
    case "shopify":
      syncedCount = await syncShopifyStoreOrders(store, forceFullSync);
      break;
    case "woocommerce":
      syncedCount = await syncWooCommerceStoreOrders(store, forceFullSync);
      break;
    case "salla":
      syncedCount = await syncSallaStoreOrders(store, forceFullSync);
      break;
    case "zid":
      syncedCount = await syncZidStoreOrders(store, forceFullSync);
      break;
    default:
      throw new Error(`Unsupported platform: ${store.platform}`);
  }

  // Update last sync timestamp
  await db
    .update(ecommerceStores)
    .set({
      lastSyncAt: new Date(),
      syncStatus: "completed",
      syncError: null,
      updatedAt: new Date(),
    })
    .where(eq(ecommerceStores.id, storeId));

  return { success: true, syncedCount };
}
