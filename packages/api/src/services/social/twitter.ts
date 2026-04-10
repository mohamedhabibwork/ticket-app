import crypto from "crypto";
import { db } from "@ticket-app/db";
import { socialAccounts } from "@ticket-app/db/schema";
import { encryptToken } from "../../lib/crypto";
import { env } from "@ticket-app/env/server";

const TWITTER_API_URL = "https://api.twitter.com/2";
const TWITTER_OAUTH_URL = "https://twitter.com/i/oauth2";

export interface TwitterOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

let twitterConfig: TwitterConfig | null = null;

export function setTwitterConfig(config: TwitterConfig): void {
  twitterConfig = config;
}

function getTwitterConfig(): TwitterConfig {
  if (!twitterConfig) {
    const clientId = env.TWITTER_CLIENT_ID;
    const clientSecret = env.TWITTER_CLIENT_SECRET;
    const callbackUrl =
      env.TWITTER_CALLBACK_URL || "http://localhost:3000/admin/social/twitter/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Twitter OAuth credentials not configured");
    }

    twitterConfig = { clientId, clientSecret, callbackUrl };
  }
  return twitterConfig;
}

function base64URLEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64URLEncode(hash);
}

let storedCodeVerifier: Map<string, string> = new Map();

export function getTwitterAuthUrl(organizationId: number): {
  url: string;
  codeVerifier: string;
  state: string;
} {
  const config = getTwitterConfig();
  const codeVerifier = generateCodeVerifier();
  const codeChallengePromise = generateCodeChallenge(codeVerifier);

  const state = `${organizationId}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`;

  const timestamp = Date.now();
  storedCodeVerifier.set(`${organizationId}:${timestamp}`, codeVerifier);
  setTimeout(() => {
    storedCodeVerifier.delete(`${organizationId}:${timestamp}`);
  }, 600000);

  const codeChallenge = codeChallengePromise;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: "tweet.read dm.read dm.write follows.read follows.write offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `${TWITTER_OAUTH_URL}/authorize?${params.toString()}`;

  return { url, codeVerifier, state };
}

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
): Promise<TwitterOAuthTokens> {
  const config = getTwitterConfig();

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(`${TWITTER_API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.callbackUrl,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter token exchange failed: ${error}`);
  }

  const data = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresIn: data.expires_in,
    expiresAt,
  };
}

export async function refreshTwitterToken(refreshToken: string): Promise<TwitterOAuthTokens> {
  const config = getTwitterConfig();

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(`${TWITTER_API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twitter token refresh failed: ${error}`);
  }

  const data = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    expiresAt,
  };
}

export async function getTwitterUser(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(
    `${TWITTER_API_URL}/users/me?user.fields=name,username,profile_image_url`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Twitter user: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getTwitterDmEvents(
  accessToken: string,
  maxResults: number = 25,
): Promise<any[]> {
  const response = await fetch(
    `${TWITTER_API_URL}/dm_events?max_results=${maxResults}&expansions=all&tweet.fields=created_at`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Twitter DM events: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getTwitterConversationMessages(
  dmConversationId: string,
  accessToken: string,
  maxResults: number = 25,
): Promise<any[]> {
  const response = await fetch(
    `${TWITTER_API_URL}/dm_conversations/${dmConversationId}/messages?max_results=${maxResults}&expansions=all`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Twitter conversation messages: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function sendTwitterDm(
  recipientId: string,
  message: string,
  accessToken: string,
): Promise<{ dm_event_id: string }> {
  const response = await fetch(`${TWITTER_API_URL}/dm_conversations/${recipientId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Twitter DM: ${error}`);
  }

  const data = await response.json();
  return { dm_event_id: data.dm_event_id };
}

export async function connectTwitterAccount(
  organizationId: number,
  userId: number | undefined,
  twitterUser: TwitterUser,
  tokens: TwitterOAuthTokens,
): Promise<number> {
  const encryptedAccessToken = encryptToken(tokens.accessToken);
  const encryptedRefreshToken = encryptToken(tokens.refreshToken);

  const [account] = await db
    .insert(socialAccounts)
    .values({
      organizationId,
      userId,
      platform: "twitter",
      platformAccountId: twitterUser.id,
      platformUsername: twitterUser.username,
      accessTokenEnc: encryptedAccessToken,
      refreshTokenEnc: encryptedRefreshToken,
      tokenExpiresAt: tokens.expiresAt,
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: [
        socialAccounts.organizationId,
        socialAccounts.platform,
        socialAccounts.platformAccountId,
      ],
      set: {
        accessTokenEnc: encryptedAccessToken,
        refreshTokenEnc: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        platformUsername: twitterUser.username,
        isActive: true,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
    .returning();

  return account.id;
}

export async function getTwitterDmHistory(
  accessToken: string,
  conversationId: string,
  maxResults: number = 50,
): Promise<any[]> {
  const allMessages: any[] = [];
  let paginationToken: string | undefined;

  do {
    const params = new URLSearchParams({
      max_results: String(maxResults),
      expansions: "all",
    });
    if (paginationToken) {
      params.set("pagination_token", paginationToken);
    }

    const response = await fetch(
      `${TWITTER_API_URL}/dm_conversations/${conversationId}/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get Twitter DM history: ${await response.text()}`);
    }

    const data = await response.json();
    allMessages.push(...(data.data || []));
    paginationToken = data.meta?.next_token;
  } while (paginationToken && allMessages.length < maxResults);

  return allMessages.slice(0, maxResults);
}

export function parseTwitterState(
  state: string,
): { organizationId: number; timestamp: number } | null {
  const parts = state.split(":");
  if (parts.length < 3) return null;

  const organizationId = parseInt(parts[0], 10);
  const timestamp = parseInt(parts[1], 10);

  if (isNaN(organizationId) || isNaN(timestamp)) return null;

  return { organizationId, timestamp };
}
