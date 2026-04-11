import { db } from "@ticket-app/db";
import { customerSessions, customerSocialIdentities, contacts } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { env } from "@ticket-app/env/server";
import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";

export const customerAuthRouter = {
  getOAuthUrl: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        provider: z.enum(["google", "facebook", "apple"]),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Auth read permission required");
      }

      const urls: Record<string, string> = {
        google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${input.redirectUri}&response_type=code&scope=email profile`,
        facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${env.FACEBOOK_CLIENT_ID}&redirect_uri=${input.redirectUri}&scope=email`,
        apple: `https://appleid.apple.com/auth/authorize?client_id=${env.APPLE_CLIENT_ID}&redirect_uri=${input.redirectUri}&response_type=code id_token&scope=email name`,
      };

      return { url: urls[input.provider] };
    }),

  handleGoogleCallback: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        code: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: input.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: input.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      const accessToken = tokenData.access_token;

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userData = (await userRes.json()) as any;
      return await linkOrCreateCustomer("google", userData.id, userData.email, userData.name);
    }),

  handleFacebookCallback: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        code: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      const tokenRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${env.FACEBOOK_CLIENT_ID}&client_secret=${env.FACEBOOK_CLIENT_SECRET}&code=${input.code}&redirect_uri=${input.redirectUri}`,
      );

      const tokenData = (await tokenRes.json()) as any;
      const accessToken = tokenData.access_token;

      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`,
      );

      const userData = (await userRes.json()) as any;
      return await linkOrCreateCustomer("facebook", userData.id, userData.email, userData.name);
    }),

  handleAppleCallback: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        code: z.string(),
        idToken: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      const tokenParts = input.idToken.split(".");
      if (tokenParts.length < 2) {
        throw new Error("Invalid Apple ID token");
      }
      const payload = JSON.parse(Buffer.from(tokenParts[1]!, "base64").toString());
      const appleUserId = payload.sub;
      const email = payload.email;

      return await linkOrCreateCustomer("apple", appleUserId, email || null, null);
    }),

  mergeAccounts: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        primaryContactId: z.coerce.number(),
        secondaryContactId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      await db
        .update(customerSocialIdentities)
        .set({ contactId: input.primaryContactId })
        .where(eq(customerSocialIdentities.contactId, input.secondaryContactId));

      await db
        .update(customerSessions)
        .set({ contactId: input.primaryContactId })
        .where(eq(customerSessions.contactId, input.secondaryContactId));

      return { success: true };
    }),

  listIdentities: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number(), contactId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Auth read permission required");
      }

      return await db
        .select()
        .from(customerSocialIdentities)
        .where(eq(customerSocialIdentities.contactId, input.contactId))
        .orderBy(desc(customerSocialIdentities.createdAt));
    }),

  getIdentity: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Auth read permission required");
      }

      const [identity] = await db
        .select()
        .from(customerSocialIdentities)
        .where(eq(customerSocialIdentities.id, input.id));
      return identity ?? null;
    }),

  linkIdentity: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactId: z.coerce.number(),
        provider: z.enum(["google", "facebook", "apple"]),
        providerUserId: z.string(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        email: z.email().optional(),
        displayName: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      const [identity] = await db
        .insert(customerSocialIdentities)
        .values({
          contactId: input.contactId,
          provider: input.provider,
          providerUserId: input.providerUserId,
          accessTokenEnc: input.accessToken,
          refreshTokenEnc: input.refreshToken,
          providerEmail: input.email,
          providerUsername: input.displayName,
        })
        .returning();
      return identity;
    }),

  unlinkIdentity: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      await db.delete(customerSocialIdentities).where(eq(customerSocialIdentities.id, input.id));
      return { success: true };
    }),

  listSessions: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number(), contactId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Auth read permission required");
      }

      return await db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.contactId, input.contactId))
        .orderBy(desc(customerSessions.createdAt));
    }),

  getSession: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Auth read permission required");
      }

      const [session] = await db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.id, input.id));
      return session ?? null;
    }),

  createSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactId: z.coerce.number(),
        customerSocialIdentityId: z.coerce.number().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [session] = await db
        .insert(customerSessions)
        .values({
          contactId: input.contactId,
          customerSocialIdentityId: input.customerSocialIdentityId,
          sessionToken,
          expiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        })
        .returning();
      return session;
    }),

  deleteSession: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      await db.delete(customerSessions).where(eq(customerSessions.id, input.id));
      return { success: true };
    }),

  deleteAllSessions: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number(), contactId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Auth write permission required");
      }

      await db.delete(customerSessions).where(eq(customerSessions.contactId, input.contactId));
      return { success: true };
    }),
};

async function linkOrCreateCustomer(
  provider: string,
  providerUserId: string,
  email: string | null,
  name: string | null,
) {
  if (!email) {
    throw new Error("Email is required for social login");
  }

  const existingIdentity = await db.query.customerSocialIdentities.findFirst({
    where: eq(customerSocialIdentities.providerUserId, providerUserId),
  });

  if (existingIdentity) {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, existingIdentity.contactId));

    return { contact, isNew: false };
  }

  const existingContact = await db.query.contacts.findFirst({
    where: eq(contacts.email, email.toLowerCase()),
  });

  if (existingContact) {
    await db.insert(customerSocialIdentities).values({
      contactId: existingContact.id,
      provider,
      providerUserId,
      providerEmail: email.toLowerCase(),
      providerUsername: name || undefined,
    });

    return { contact: existingContact, isNew: false, merged: true };
  }

  const [newContact] = await db
    .insert(contacts)
    .values({
      organizationId: 1,
      email: email.toLowerCase(),
      firstName: name?.split(" ")[0] || null,
      lastName: name?.split(" ").slice(1).join(" ") || null,
    })
    .returning();

  if (!newContact) {
    throw new Error("Failed to create contact");
  }

  await db.insert(customerSocialIdentities).values({
    contactId: newContact.id,
    provider,
    providerUserId,
    providerEmail: email.toLowerCase(),
    providerUsername: name || undefined,
  });

  return { contact: newContact, isNew: true, merged: false };
}
