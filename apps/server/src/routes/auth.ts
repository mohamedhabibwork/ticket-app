import { Hono } from "hono";
import { env } from "@ticket-app/env/server";
import { loginWithOAuth } from "@ticket-app/api/services/auth";
import { sessions } from "@ticket-app/db/lib/sessions";

const auth = new Hono();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

auth.get("/google", async (c) => {
  const redirectUri = `${env.CORS_ORIGIN}/auth/google/callback`;
  const state = crypto.randomUUID();

  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  await sessions.set(
    `oauth_state:${state}`,
    {
      userId: "",
      organizationId: "",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    600,
  );

  return c.redirect(authUrl.toString());
});

auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.json({ error: `OAuth error: ${error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  const storedState = await sessions.get(`oauth_state:${state}`);
  if (!storedState) {
    return c.json({ error: "Invalid or expired state" }, 400);
  }

  await sessions.delete(`oauth_state:${state}`);

  const redirectUri = `${env.CORS_ORIGIN}/auth/google/callback`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return c.json({ error: `Token exchange failed: ${errorText}` }, 400);
  }

  const tokens = (await tokenResponse.json()) as GoogleTokens;

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    return c.json({ error: "Failed to fetch user info" }, 400);
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  const ipAddress = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || undefined;

  try {
    const result = await loginWithOAuth(
      "google",
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      },
      {
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.name?.split(" ")[0] || "Unknown",
        lastName: userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || "Unknown",
        avatarUrl: userInfo.picture,
        googleId: userInfo.id,
      },
      ipAddress,
      userAgent,
    );

    return c.json({
      success: true,
      user: result.user,
      sessionToken: result.sessionToken,
      requires2FA: result.requires2FA,
      tempToken: result.tempToken,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return c.json({ error: message }, 401);
  }
});

export { auth };
