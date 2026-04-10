import { env } from "@ticket-app/env/server";

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_DEBUG_URL = "https://graph.facebook.com/v18.0/debug_token";

const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_TOKEN_INFO_URL = "https://api.twitter.com/2/users/me";

const INSTAGRAM_TOKEN_URL = "https://graph.instagram.com/v18.0/oauth/access_token";
const INSTAGRAM_TOKEN_INFO_URL = "https://graph.instagram.com/v18.0/me";

export async function refreshSocialToken(
  platform: string,
  refreshToken: string,
): Promise<TokenResponse> {
  switch (platform.toLowerCase()) {
    case "facebook":
      return refreshFacebookToken(refreshToken);
    case "twitter":
      return refreshTwitterToken(refreshToken);
    case "instagram":
      return refreshInstagramToken(refreshToken);
    case "whatsapp":
      return refreshWhatsAppToken(refreshToken);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function validateSocialToken(platform: string, accessToken: string): Promise<boolean> {
  switch (platform.toLowerCase()) {
    case "facebook":
      return validateFacebookToken(accessToken);
    case "twitter":
      return validateTwitterToken(accessToken);
    case "instagram":
      return validateInstagramToken(accessToken);
    case "whatsapp":
      return validateWhatsAppToken(accessToken);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function refreshFacebookToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(
    `${FACEBOOK_TOKEN_URL}?grant_type=fb_exchange_token&client_id=${env.FACEBOOK_CLIENT_ID}&client_secret=${env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${refreshToken}`,
  );

  if (!response.ok) {
    throw new Error("Failed to refresh Facebook token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function refreshTwitterToken(refreshToken: string): Promise<TokenResponse> {
  const credentials = Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString(
    "base64",
  );

  const response = await fetch(TWITTER_TOKEN_URL, {
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
    throw new Error("Failed to refresh Twitter token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function refreshInstagramToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(
    `${INSTAGRAM_TOKEN_URL}?grant_type=ig_exchange_token&client_secret=${env.INSTAGRAM_CLIENT_SECRET}&access_token=${refreshToken}`,
  );

  if (!response.ok) {
    throw new Error("Failed to refresh Instagram token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function refreshWhatsAppToken(refreshToken: string): Promise<TokenResponse> {
  // WhatsApp uses similar refresh mechanism
  const response = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.WHATSAPP_CLIENT_ID}&client_secret=${env.WHATSAPP_CLIENT_SECRET}&fb_exchange_token=${refreshToken}`,
  );

  if (!response.ok) {
    throw new Error("Failed to refresh WhatsApp token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function validateFacebookToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${FACEBOOK_DEBUG_URL}?input_token=${accessToken}&access_token=${env.FACEBOOK_CLIENT_ID}|${env.FACEBOOK_CLIENT_SECRET}`,
    );
    const data = await response.json();
    return data.data?.is_valid === true;
  } catch {
    return false;
  }
}

async function validateTwitterToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(TWITTER_TOKEN_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateInstagramToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${INSTAGRAM_TOKEN_INFO_URL}?access_token=${accessToken}`);
    const data = await response.json();
    return data.id != null;
  } catch {
    return false;
  }
}

async function validateWhatsAppToken(accessToken: string): Promise<boolean> {
  try {
    // WhatsApp token validation via Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${env.FACEBOOK_CLIENT_ID}|${env.FACEBOOK_CLIENT_SECRET}`,
    );
    const data = await response.json();
    return data.data?.is_valid === true;
  } catch {
    return false;
  }
}
