import { db } from "@ticket-app/db";
import { socialAccounts } from "@ticket-app/db/schema";
import crypto from "crypto";

import { encryptToken } from "../../lib/crypto";
import { env } from "@ticket-app/env/server";

const FACEBOOK_API_VERSION = "v18.0";
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export interface FacebookOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

export interface FacebookConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

interface FacebookTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface FacebookPagesResponse {
  data: FacebookPage[];
}

interface InstagramBusinessResponse {
  instagram_business_account?: {
    id: string;
  };
}

interface FacebookLongLivedTokenResponse {
  access_token: string;
}

interface FacebookConversationsResponse {
  data: any[];
}

interface FacebookMessagesResponse {
  data: any[];
}

interface FacebookSendMessageResponse {
  message_id: string;
}

interface FacebookSendMessageResult {
  messageId: string;
}

let facebookConfig: FacebookConfig | null = null;

export function setFacebookConfig(config: FacebookConfig): void {
  facebookConfig = config;
}

function getFacebookConfig(): FacebookConfig {
  if (!facebookConfig) {
    const clientId = env.FACEBOOK_APP_ID;
    const clientSecret = env.FACEBOOK_APP_SECRET;
    const callbackUrl =
      env.FACEBOOK_CALLBACK_URL || "http://localhost:3000/admin/social/facebook/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Facebook OAuth credentials not configured");
    }

    facebookConfig = { clientId, clientSecret, callbackUrl };
  }
  return facebookConfig;
}

export function getFacebookAuthUrl(state: string): string {
  const config = getFacebookConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope:
      "pages_read_engagement,pages_manage_messages,instagram_basic,instagram_manage_messages,instagram_manage_comments",
    response_type: "code",
    state,
  });

  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeFacebookCode(code: string): Promise<FacebookOAuthTokens> {
  const config = getFacebookConfig();

  const response = await fetch(
    `${FACEBOOK_TOKEN_URL}?` +
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callbackUrl,
        code,
        grant_type: "authorization_code",
      }),
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Facebook token exchange failed: ${error}`);
  }

  const data = (await response.json()) as FacebookTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresIn: data.expires_in || 5184000,
  };
}

export async function refreshFacebookToken(refreshToken: string): Promise<FacebookOAuthTokens> {
  const config = getFacebookConfig();

  const response = await fetch(
    `${FACEBOOK_TOKEN_URL}?` +
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "fb_exchange_token",
      }),
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Facebook token refresh failed: ${error}`);
  }

  const data = (await response.json()) as FacebookTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 5184000,
  };
}

export async function getFacebookUser(accessToken: string): Promise<FacebookUser> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/me?fields=id,name,email,picture&access_token=${accessToken}`,
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Facebook user: ${error}`);
  }

  return (await response.json()) as FacebookUser;
}

export async function getFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  const response = await fetch(`${FACEBOOK_GRAPH_URL}/me/accounts?access_token=${accessToken}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Facebook pages: ${error}`);
  }

  const data = (await response.json()) as FacebookPagesResponse;
  return data.data || [];
}

export async function getInstagramBusinessId(
  pageId: string,
  accessToken: string,
): Promise<string | null> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as InstagramBusinessResponse;
  return data.instagram_business_account?.id || null;
}

export async function getFacebookLongLivedToken(accessToken: string): Promise<string> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: getFacebookConfig().clientId,
        client_secret: getFacebookConfig().clientSecret,
        fb_exchange_token: accessToken,
      }),
  );

  if (!response.ok) {
    throw new Error("Failed to get long-lived Facebook token");
  }

  const data = (await response.json()) as FacebookLongLivedTokenResponse;
  return data.access_token;
}

export async function connectFacebookPage(
  organizationId: number,
  userId: number | undefined,
  page: FacebookPage,
): Promise<number> {
  const longLivedToken = await getFacebookLongLivedToken(page.access_token);
  const encryptedToken = encryptToken(longLivedToken);
  const encryptedRefresh = encryptToken(page.access_token);

  const expiresAt = new Date(Date.now() + 5184000 * 1000);

  const [account] = await db
    .insert(socialAccounts)
    .values({
      organizationId,
      userId,
      platform: "facebook",
      platformAccountId: page.id,
      platformUsername: page.name,
      accessTokenEnc: encryptedToken,
      refreshTokenEnc: encryptedRefresh,
      tokenExpiresAt: expiresAt,
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
        accessTokenEnc: encryptedToken,
        refreshTokenEnc: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        platformUsername: page.name,
        isActive: true,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
    .returning();

  if (!account) {
    throw new Error("Failed to connect Facebook page");
  }

  return account.id;
}

export async function connectInstagramAccount(
  organizationId: number,
  userId: number | undefined,
  instagramId: string,
  username: string,
  accessToken: string,
): Promise<number> {
  const longLivedToken = await getFacebookLongLivedToken(accessToken);
  const encryptedToken = encryptToken(longLivedToken);
  const encryptedRefresh = encryptToken(accessToken);

  const expiresAt = new Date(Date.now() + 5184000 * 1000);

  const [account] = await db
    .insert(socialAccounts)
    .values({
      organizationId,
      userId,
      platform: "instagram",
      platformAccountId: instagramId,
      platformUsername: username,
      accessTokenEnc: encryptedToken,
      refreshTokenEnc: encryptedRefresh,
      tokenExpiresAt: expiresAt,
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
        accessTokenEnc: encryptedToken,
        refreshTokenEnc: encryptedRefresh,
        tokenExpiresAt: expiresAt,
        platformUsername: username,
        isActive: true,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
    .returning();

  if (!account) {
    throw new Error("Failed to connect Instagram account");
  }

  return account.id;
}

export async function getFacebookPageMessages(
  pageId: string,
  accessToken: string,
  limit: number = 25,
): Promise<any[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${pageId}/conversations?fields=id,snippet,updated_time,participants&limit=${limit}&access_token=${accessToken}`,
  );

  if (!response.ok) {
    throw new Error("Failed to get Facebook page messages");
  }

  const data = (await response.json()) as FacebookConversationsResponse;
  return data.data || [];
}

export async function getFacebookConversationMessages(
  conversationId: string,
  accessToken: string,
  limit: number = 25,
): Promise<any[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${conversationId}/messages?fields=id,message,from,to,created_time,attachments&limit=${limit}&access_token=${accessToken}`,
  );

  if (!response.ok) {
    throw new Error("Failed to get Facebook conversation messages");
  }

  const data = (await response.json()) as FacebookMessagesResponse;
  return data.data || [];
}

export async function sendFacebookMessage(
  recipientId: string,
  message: string,
  accessToken: string,
): Promise<FacebookSendMessageResult> {
  const response = await fetch(`${FACEBOOK_GRAPH_URL}/me/messages?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send Facebook message: ${error}`);
  }

  const data = (await response.json()) as FacebookSendMessageResponse;
  return { messageId: data.message_id };
}

export function generateFacebookState(organizationId: number): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString("hex");
  return `${organizationId}:${timestamp}:${random}`;
}

export function parseFacebookState(
  state: string,
): { organizationId: number; timestamp: number } | null {
  const parts = state.split(":");
  if (parts.length !== 3) return null;

  const organizationId = parseInt(parts[0] ?? "", 10);
  const timestamp = parseInt(parts[1] ?? "", 10);

  if (isNaN(organizationId) || isNaN(timestamp)) return null;

  return { organizationId, timestamp };
}
