import { db } from "@ticket-app/db";
import { customerSessions, customerSocialIdentities, contacts } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";
import { randomBytes } from "crypto";

import { publicProcedure } from "../index";

export const customerAuthRouter = {
  getOAuthUrl: publicProcedure
    .input(
      z.object({
        provider: z.enum(["google", "facebook", "apple"]),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const urls: Record<string, string> = {
        google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${input.redirectUri}&response_type=code&scope=email profile`,
        facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${input.redirectUri}&scope=email`,
        apple: `https://appleid.apple.com/auth/authorize?client_id=${process.env.APPLE_CLIENT_ID}&redirect_uri=${input.redirectUri}&response_type=code id_token&scope=email name`,
      };

      return { url: urls[input.provider] };
    }),

  handleGoogleCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: input.code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: input.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userData = await userRes.json();
      return await linkOrCreateCustomer("google", userData.id, userData.email, userData.name);
    }),

  handleFacebookCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${input.code}&redirect_uri=${input.redirectUri}`
      );

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`
      );

      const userData = await userRes.json();
      return await linkOrCreateCustomer("facebook", userData.id, userData.email, userData.name);
    }),

  handleAppleCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        idToken: z.string(),
        redirectUri: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const payload = JSON.parse(Buffer.from(input.idToken.split(".")[1], "base64").toString());
      const appleUserId = payload.sub;
      const email = payload.email;

      return await linkOrCreateCustomer("apple", appleUserId, email || null, null);
    }),

  mergeAccounts: publicProcedure
    .input(
      z.object({
        primaryContactId: z.number(),
        secondaryContactId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

  listIdentities: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(customerSocialIdentities)
        .where(eq(customerSocialIdentities.contactId, input.contactId))
        .orderBy(desc(customerSocialIdentities.createdAt));
    }),

  getIdentity: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [identity] = await db
        .select()
        .from(customerSocialIdentities)
        .where(eq(customerSocialIdentities.id, input.id));
      return identity ?? null;
    }),

  linkIdentity: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        provider: z.enum(["google", "facebook", "apple"]),
        providerUserId: z.string(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        email: z.string().email().optional(),
        displayName: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [identity] = await db
        .insert(customerSocialIdentities)
        .values(input)
        .returning();
      return identity;
    }),

  unlinkIdentity: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(customerSocialIdentities).where(eq(customerSocialIdentities.id, input.id));
      return { success: true };
    }),

  listSessions: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.contactId, input.contactId))
        .orderBy(desc(customerSessions.createdAt));
    }),

  getSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [session] = await db
        .select()
        .from(customerSessions)
        .where(eq(customerSessions.id, input.id));
      return session ?? null;
    }),

  createSession: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        customerSocialIdentityId: z.number().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [session] = await db
        .insert(customerSessions)
        .values({
          contactId: input.contactId,
          customerSocialIdentityId: input.customerSocialIdentityId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        })
        .returning();
      return session;
    }),

  deleteSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(customerSessions).where(eq(customerSessions.id, input.id));
      return { success: true };
    }),

  deleteAllSessions: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(customerSessions).where(eq(customerSessions.contactId, input.contactId));
      return { success: true };
    }),
};

async function linkOrCreateCustomer(
  provider: string,
  providerUserId: string,
  email: string | null,
  name: string | null
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
      email: email.toLowerCase(),
      firstName: name?.split(" ")[0] || null,
      lastName: name?.split(" ").slice(1).join(" ") || null,
    })
    .returning();

  await db.insert(customerSocialIdentities).values({
    contactId: newContact.id,
    provider,
    providerUserId,
    providerEmail: email.toLowerCase(),
    providerUsername: name || undefined,
  });

  return { contact: newContact, isNew: true, merged: false };
}
