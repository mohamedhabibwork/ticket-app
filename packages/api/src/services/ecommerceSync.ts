import { db } from "@ticket-app/db";
import { ecommerceStores, ecommerceOrders } from "@ticket-app/db/schema";
import { and, eq, isNull, like, or } from "drizzle-orm";
import { getShopifyConfig, syncShopifyStoreOrders, fetchShopifyOrders } from "./ecommerce/shopify";
import {
  getWooCommerceConfig,
  syncWooCommerceStoreOrders,
  fetchWooCommerceOrders,
} from "./ecommerce/woocommerce";
import { getSallaConfig, syncSallaStoreOrders, fetchSallaOrders } from "./ecommerce/salla";
import type { SallaOrderStatus } from "./ecommerce/salla";
import { getZidConfig, syncZidStoreOrders, fetchZidOrders } from "./ecommerce/zid";
import type { ZidOrderStatus } from "./ecommerce/zid";

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

  const { status, limit = 50 } = options;

  switch (store.platform?.toLowerCase()) {
    case "shopify": {
      const config = await getShopifyConfig(store.id);
      if (!config) throw new Error("Failed to get Shopify config");
      return fetchShopifyOrders(config, { status, limit });
    }
    case "woocommerce": {
      const config = await getWooCommerceConfig(store.id);
      if (!config) throw new Error("Failed to get WooCommerce config");
      return fetchWooCommerceOrders(config, { per_page: limit, status });
    }
    case "salla": {
      const config = await getSallaConfig(store.id);
      if (!config) throw new Error("Failed to get Salla config");
      return fetchSallaOrders(config, { limit, status: status as SallaOrderStatus | undefined });
    }
    case "zid": {
      const config = await getZidConfig(store.id);
      if (!config) throw new Error("Failed to get Zid config");
      return fetchZidOrders(config, { limit, status: status as ZidOrderStatus | undefined });
    }
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

  const conditions = [
    eq(ecommerceStores.organizationId, organizationId),
    isNull(ecommerceStores.deletedAt),
    isNull(ecommerceOrders.deletedAt),
    or(
      like(ecommerceOrders.customerEmail, `%${query}%`),
      like(ecommerceOrders.customerName, `%${query}%`),
      like(ecommerceOrders.orderNumber, `%${query}%`),
    ),
  ];

  if (platform) {
    conditions.push(eq(ecommerceStores.platform, platform));
  }

  const localOrders = await db
    .select()
    .from(ecommerceOrders)
    .innerJoin(ecommerceStores, eq(ecommerceOrders.storeId, ecommerceStores.id))
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

  const sinceDate = forceFullSync ? undefined : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  switch (store.platform?.toLowerCase()) {
    case "shopify":
      syncedCount = (await syncShopifyStoreOrders(store.id, sinceDate)).synced;
      break;
    case "woocommerce":
      syncedCount = (await syncWooCommerceStoreOrders(store.id, sinceDate)).synced;
      break;
    case "salla":
      syncedCount = (await syncSallaStoreOrders(store.id, sinceDate)).synced;
      break;
    case "zid":
      syncedCount = (await syncZidStoreOrders(store.id, sinceDate)).synced;
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
