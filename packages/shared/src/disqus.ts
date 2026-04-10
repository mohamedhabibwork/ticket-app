const DISQUS_API_URL = "https://disqus.com/api/3.0";

export interface DisqusForum {
  id: string;
  name: string;
  shortname: string;
}

export interface DisqusPost {
  id: string;
  message: string;
  html: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    email?: string;
  };
  thread?: {
    id: string;
    identifier: string;
    title?: string;
  };
  parent?: string;
}

export interface DisqusClientConfig {
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
}

export class DisqusClient {
  private apiKey: string;
  private apiSecret: string;
  private accessToken?: string;

  constructor(config: DisqusClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accessToken = config.accessToken;
  }

  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${DISQUS_API_URL}/${endpoint}.json`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("api_secret", this.apiSecret);
    if (this.accessToken) {
      url.searchParams.set("access_token", this.accessToken);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Disqus API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { response?: T | string; code?: number };

    if (data.code !== 0 && data.code !== undefined) {
      throw new Error(`Disqus API error: ${data.code} - ${data.response}`);
    }

    return data.response as T;
  }

  async listForums(): Promise<DisqusForum[]> {
    return this.request<DisqusForum[]>("forums/list", {
      limit: "100",
    });
  }

  async getForumDetails(shortname: string): Promise<DisqusForum> {
    const forums = await this.request<DisqusForum[]>("forums/details", {
      forum: shortname,
    });
    return forums[0] as DisqusForum;
  }

  async listPosts(forum: string, since?: Date): Promise<DisqusPost[]> {
    const params: Record<string, string> = {
      forum,
      limit: "100",
      related: "thread,author",
    };

    if (since) {
      params.since = Math.floor(since.getTime() / 1000).toString();
    }

    return this.request<DisqusPost[]>("posts/list", params);
  }

  async listThreads(
    forum: string,
  ): Promise<Array<{ id: string; identifier: string; title?: string }>> {
    return this.request<Array<{ id: string; identifier: string; title?: string }>>("threads/list", {
      forum,
      limit: "100",
    });
  }

  async createPost(threadId: string, message: string, authorEmail?: string): Promise<DisqusPost> {
    return this.request<DisqusPost>("posts/create", {
      thread: threadId,
      message,
      email: authorEmail || "",
    });
  }
}

export function createDisqusClient(config: DisqusClientConfig): DisqusClient {
  return new DisqusClient(config);
}
