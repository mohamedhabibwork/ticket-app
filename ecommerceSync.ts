export interface FetchStoreOrdersOptions {
  status?: string;
  limit: number;
  offset: number;
}

export interface SearchOrdersOptions {
  platform?: string;
  limit: number;
}

export async function fetchStoreOrders(
  _storeId: number,
  _options: FetchStoreOrdersOptions,
): Promise<{ orders: any[]; total: number }> {
  return { orders: [], total: 0 };
}

export async function searchOrdersAcrossStores(
  _organizationId: number,
  _query: string,
  _options: SearchOrdersOptions,
): Promise<{ orders: any[]; total: number }> {
  return { orders: [], total: 0 };
}
