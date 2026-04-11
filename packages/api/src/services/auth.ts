import { db } from "@ticket-app/db";
import { users, userSessions, userRoles, roles, seats, subscriptions } from "@ticket-app/db/schema";
import { sessions } from "@ticket-app/db/lib/sessions";
import { hashPassword, verifyPassword } from "../lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import type { SessionData } from "@ticket-app/db/lib/sessions";

const SESSION_TTL_SECONDS = 24 * 60 * 60;

export interface AuthResult {
  user: {
    id: number;
    uuid: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatarUrl: string | null;
    organizationId: number;
    locale: string;
    timezone: string;
    isPlatformAdmin: boolean;
    roles: { id: number; name: string; slug: string }[];
  };
  sessionToken: string;
  requires2FA: boolean;
  tempToken?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface OAuthUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  googleId?: string;
}

export async function loginWithEmail(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.query.users.findFirst({
    where: and(eq(users.email, normalizedEmail), isNull(users.deletedAt)),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
      twoFactor: true,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  if (!user.passwordHash) {
    throw new Error("Password not set for this account");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  if (user.twoFactor?.isEnabled) {
    const tempToken = crypto.randomUUID();
    await sessions.set(
      `2fa_temp:${tempToken}`,
      {
        userId: user.id.toString(),
        organizationId: user.organizationId.toString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ipAddress,
        userAgent,
      },
      300,
    );

    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        organizationId: user.organizationId,
        locale: user.locale,
        timezone: user.timezone,
        isPlatformAdmin: user.isPlatformAdmin,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          slug: ur.role.slug,
        })),
      },
      sessionToken: "",
      requires2FA: true,
      tempToken,
    };
  }

  const sessionToken = crypto.randomUUID();
  const sessionData: SessionData = {
    userId: user.id.toString(),
    organizationId: user.organizationId.toString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    ipAddress,
    userAgent,
  };

  await sessions.set(sessionToken, sessionData, SESSION_TTL_SECONDS);

  await db.insert(userSessions).values({
    userId: user.id,
    ipAddress: ipAddress || "unknown",
    userAgent,
    deviceType: getDeviceType(userAgent),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    lastActivityAt: new Date(),
  });

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      locale: user.locale,
      timezone: user.timezone,
      isPlatformAdmin: user.isPlatformAdmin,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
      })),
    },
    sessionToken,
    requires2FA: false,
  };
}

export async function verify2FA(tempToken: string, code: string): Promise<AuthResult> {
  const tempSession = await sessions.get(`2fa_temp:${tempToken}`);
  if (!tempSession) {
    throw new Error("Invalid or expired 2FA session");
  }

  const userId = parseInt(tempSession.userId);

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
      twoFactor: true,
    },
  });

  if (!user || !user.twoFactor?.isEnabled) {
    throw new Error("2FA not enabled for this user");
  }

  const isValid = authenticator.verify({
    token: code,
    secret: user.twoFactor.totpSecret!,
  });

  if (!isValid) {
    throw new Error("Invalid verification code");
  }

  await sessions.delete(`2fa_temp:${tempToken}`);

  const sessionToken = crypto.randomUUID();
  const sessionData: SessionData = {
    userId: user.id.toString(),
    organizationId: user.organizationId.toString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    ipAddress: tempSession.ipAddress,
    userAgent: tempSession.userAgent,
  };

  await sessions.set(sessionToken, sessionData, SESSION_TTL_SECONDS);

  await db.insert(userSessions).values({
    userId: user.id,
    ipAddress: tempSession.ipAddress || "unknown",
    userAgent: tempSession.userAgent,
    deviceType: getDeviceType(tempSession.userAgent),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    lastActivityAt: new Date(),
  });

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      locale: user.locale,
      timezone: user.timezone,
      isPlatformAdmin: user.isPlatformAdmin,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
      })),
    },
    sessionToken,
    requires2FA: false,
  };
}

export async function loginWithOAuth(
  _provider: "google",
  _tokens: OAuthTokens,
  userInfo: OAuthUserInfo,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  void _provider;
  void _tokens;
  const existingUser = await db.query.users.findFirst({
    where: and(eq(users.email, userInfo.email.toLowerCase()), isNull(users.deletedAt)),
    with: {
      roles: {
        with: {
          role: true,
        },
      },
      twoFactor: true,
    },
  });

  if (!existingUser) {
    throw new Error("No account found with this email. Please register first.");
  }

  if (!existingUser.isActive) {
    throw new Error("Account is deactivated");
  }

  if (existingUser.twoFactor?.isEnabled) {
    const tempToken = crypto.randomUUID();
    await sessions.set(
      `oauth_2fa:${tempToken}`,
      {
        userId: existingUser.id.toString(),
        organizationId: existingUser.organizationId.toString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ipAddress,
        userAgent,
      },
      300,
    );

    return {
      user: {
        id: existingUser.id,
        uuid: existingUser.uuid,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        displayName: existingUser.displayName,
        avatarUrl: existingUser.avatarUrl,
        organizationId: existingUser.organizationId,
        locale: existingUser.locale,
        timezone: existingUser.timezone,
        isPlatformAdmin: existingUser.isPlatformAdmin,
        roles: existingUser.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          slug: ur.role.slug,
        })),
      },
      sessionToken: "",
      requires2FA: true,
      tempToken,
    };
  }

  return createSessionFromUser(existingUser, ipAddress, userAgent);
}

export async function registerWithEmail(
  organizationId: number,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  ipAddress?: string,
  userAgent?: string,
  locale?: string,
  timezone?: string,
): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(users.email, normalizedEmail),
      eq(users.organizationId, organizationId),
      isNull(users.deletedAt),
    ),
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      organizationId,
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      locale: locale || "en",
      timezone: timezone || "UTC",
      emailVerifiedAt: new Date(),
    })
    .returning();

  if (!newUser) {
    throw new Error("Failed to create user");
  }

  const defaultRole = await db.query.roles.findFirst({
    where: and(eq(roles.organizationId, organizationId), sql`slug = 'agent'`),
  });

  if (defaultRole) {
    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: defaultRole.id,
    });
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, organizationId),
  });

  if (subscription) {
    await db.insert(seats).values({
      subscriptionId: subscription.id,
      userId: newUser.id,
      role: "agent",
      addedAt: new Date(),
    });
  }

  return createSessionFromUser(newUser as any, ipAddress, userAgent);
}

export async function logout(sessionToken: string): Promise<void> {
  await sessions.delete(sessionToken);
}

export async function validateSession(sessionToken: string): Promise<SessionData | null> {
  const session = await sessions.get(sessionToken);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    await sessions.delete(sessionToken);
    return null;
  }

  return session;
}

export async function refreshSession(sessionToken: string): Promise<SessionData | null> {
  const session = await sessions.get(sessionToken);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    await sessions.delete(sessionToken);
    return null;
  }

  await sessions.refresh(sessionToken, SESSION_TTL_SECONDS);

  const newExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const updatedSession: SessionData = {
    ...session,
    expiresAt: newExpiresAt.toISOString(),
  };

  return updatedSession;
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  await sessions.deleteByUserId(userId.toString());

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

export async function revokeSession(sessionToken: string, userId: number): Promise<void> {
  await sessions.delete(sessionToken);

  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.userId, userId), sql`${userSessions.revokedAt} IS NULL`));
}

async function createSessionFromUser(
  user: typeof users.$inferSelect & {
    roles: { role: typeof roles.$inferSelect }[];
  },
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  const sessionToken = crypto.randomUUID();
  const sessionData: SessionData = {
    userId: user.id.toString(),
    organizationId: user.organizationId.toString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    ipAddress,
    userAgent,
  };

  await sessions.set(sessionToken, sessionData, SESSION_TTL_SECONDS);

  await db.insert(userSessions).values({
    userId: user.id,
    ipAddress: ipAddress || "unknown",
    userAgent,
    deviceType: getDeviceType(userAgent),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    lastActivityAt: new Date(),
  });

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

  return {
    user: {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      locale: user.locale,
      timezone: user.timezone,
      isPlatformAdmin: user.isPlatformAdmin,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
      })),
    },
    sessionToken,
    requires2FA: false,
  };
}

function getDeviceType(userAgent?: string): string {
  if (!userAgent) return "unknown";
  if (userAgent.includes("Mobile") || userAgent.includes("Android")) return "mobile";
  if (userAgent.includes("Tablet") || userAgent.includes("iPad")) return "tablet";
  return "desktop";
}

import { sql } from "drizzle-orm";
