const AMAZON_SP_API_BASE = "https://sellingpartnerapi-na.amazon.com";

export interface AmazonTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface AmazonOrder {
  orderId: string;
  sellerOrderId?: string;
  marketplaceId: string;
  buyerEmail?: string;
  buyerName?: string;
  orderStatus: string;
  fulfillmentChannel: string;
  shipServiceLevel?: string;
  orderTotal?: {
    currencyCode: string;
    amount: string;
  };
  numberOfItemsShipped: number;
  numberOfItemsUnshipped: number;
  items?: AmazonOrderItem[];
  createdDate: string;
  lastUpdateDate: string;
}

export interface AmazonOrderItem {
  asin: string;
  orderItemId: string;
  sellerSku?: string;
  title: string;
  quantityOrdered: number;
  quantityShipped: number;
  itemPrice?: {
    currencyCode: string;
    amount: string;
  };
}

export interface AmazonMessage {
  marketplaceId: string;
  buyerId?: string;
  sellerId: string;
  messageId: string;
  messageContent: string;
  subject?: string;
  orderId?: string;
  productAsin?: string;
  creationDate: string;
}

export class AmazonSPAPIClient {
  private clientId: string;
  private clientSecret: string;
  private refreshToken?: string;
  private accessToken?: string;
  private expiresAt?: Date;
  private marketplaceId: string;

  constructor(options: {
    clientId: string;
    clientSecret: string;
    refreshToken?: string;
    marketplaceId: string;
  }) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.marketplaceId = options.marketplaceId;
  }

  setTokens(tokens: AmazonTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken || this.refreshToken;
    this.expiresAt = tokens.expiresAt;
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.accessToken && this.expiresAt && this.expiresAt > new Date()) {
      return this.accessToken;
    }

    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    return this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<string> {
    const response = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken!,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Amazon token refresh error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token || this.refreshToken;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: object
  ): Promise<T> {
    const accessToken = await this.ensureAccessToken();

    const url = `${AMAZON_SP_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      "x-amz-access-token": accessToken,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amazon SP-API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async getOrders(startDate: Date): Promise<AmazonOrder[]> {
    const data = await this.request<{
      payload: { orders: AmazonOrder[] };
    }>(
      `/orders/v0/orders?MarketplaceIds=${this.marketplaceId}&CreatedAfter=${startDate.toISOString()}`
    );
    return data.payload?.orders || [];
  }

  async getOrder(orderId: string): Promise<AmazonOrder | null> {
    try {
      const data = await this.request<{ payload: AmazonOrder }>(
        `/orders/v0/orders/${orderId}`
      );
      return data.payload;
    } catch {
      return null;
    }
  }

  async getOrderItems(orderId: string): Promise<AmazonOrderItem[]> {
    const data = await this.request<{ payload: { OrderItems: AmazonOrderItem[] } }>(
      `/orders/v0/orders/${orderId}/orderItems`
    );
    return data.payload?.OrderItems || [];
  }

  async getMessagingMessages(
    orderId: string
  ): Promise<AmazonMessage[]> {
    try {
      const data = await this.request<{ payload: AmazonMessage[] }>(
        `/messaging/v1/orders/${orderId}/messages`
      );
      return data.payload || [];
    } catch {
      return [];
    }
  }

  async getSolicitations(
    orderId: string
  ): Promise<Array<{ messageId: string; content: string }>> {
    try {
      const data = await this.request<{ payload: Array<{ messageId: string; content: string }> }>(
        `/messaging/v1/orders/${orderId}/solicitations`
      );
      return data.payload || [];
    } catch {
      return [];
    }
  }
}

export function createAmazonClient(options: {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  marketplaceId: string;
}): AmazonSPAPIClient {
  return new AmazonSPAPIClient(options);
}