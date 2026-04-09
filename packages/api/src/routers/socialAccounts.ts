import { db } from "@ticket-app/db";
import { socialAccounts } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { encryptToken, decryptToken } from "../lib/crypto";

export const socialAccountsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(socialAccounts.organizationId, input.organizationId),
        isNull(socialAccounts.deletedAt),
      ];

      if (input.platform) {
        conditions.push(eq(socialAccounts.platform, input.platform));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(socialAccounts.isActive, input.isActive));
      }

      const accounts = await db.query.socialAccounts.findMany({
        where: and(...conditions),
        orderBy: [desc(socialAccounts.createdAt)],
      });

      return accounts.map((account) => ({
        ...account,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      }));
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.id, input.id),
          eq(socialAccounts.organizationId, input.organizationId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (!account) return null;

      return {
        ...account,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  getByPlatform: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.string(),
        platformAccountId: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, input.platform),
          eq(socialAccounts.platformAccountId, input.platformAccountId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (!account) return null;

      return {
        ...account,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
        platform: z.string(),
        platformAccountId: z.string(),
        platformUsername: z.string().optional(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const accessTokenEnc = encryptToken(input.accessToken);
      const refreshTokenEnc = input.refreshToken ? encryptToken(input.refreshToken) : null;

      const [account] = await db
        .insert(socialAccounts)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: input.platform,
          platformAccountId: input.platformAccountId,
          platformUsername: input.platformUsername,
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      return {
        ...account,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  updateToken: publicProcedure
    .input(
      z.object({
        id: z.number(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const accessTokenEnc = encryptToken(input.accessToken);
      const refreshTokenEnc = input.refreshToken ? encryptToken(input.refreshToken) : undefined;

      const [account] = await db
        .update(socialAccounts)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, input.id))
        .returning();

      return {
        ...account,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  setActive: publicProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean(),
      }),
    )
    .handler(async ({ input }) => {
      const [account] = await db
        .update(socialAccounts)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, input.id))
        .returning();

      return account ? { ...account, accessTokenEnc: undefined, refreshTokenEnc: undefined } : null;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
        deletedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(socialAccounts)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(eq(socialAccounts.id, input.id));

      return { success: true };
    }),

  getDecryptedToken: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: eq(socialAccounts.id, input.id),
      });

      if (!account) return null;

      return {
        accessToken: decryptToken(account.accessTokenEnc),
        refreshToken: account.refreshTokenEnc ? decryptToken(account.refreshTokenEnc) : null,
        tokenExpiresAt: account.tokenExpiresAt,
      };
    }),

  connectFacebook: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        pageId: z.string(),
        accessToken: z.string(),
        pageName: z.string().optional(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, "facebook"),
          eq(socialAccounts.platformAccountId, input.pageId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (existing) {
        const accessTokenEnc = encryptToken(input.accessToken);
        const [updated] = await db
          .update(socialAccounts)
          .set({
            accessTokenEnc,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing.id))
          .returning();
        return { ...updated, accessTokenEnc: undefined, refreshTokenEnc: undefined };
      }

      const accessTokenEnc = encryptToken(input.accessToken);
      const [account] = await db
        .insert(socialAccounts)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: "facebook",
          platformAccountId: input.pageId,
          platformUsername: input.pageName,
          accessTokenEnc,
          isActive: true,
        })
        .returning();

      return { ...account, accessTokenEnc: undefined, refreshTokenEnc: undefined };
    }),

  connectInstagram: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        accountId: z.string(),
        accessToken: z.string(),
        username: z.string().optional(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, "instagram"),
          eq(socialAccounts.platformAccountId, input.accountId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (existing) {
        const accessTokenEnc = encryptToken(input.accessToken);
        const [updated] = await db
          .update(socialAccounts)
          .set({
            accessTokenEnc,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing.id))
          .returning();
        return { ...updated, accessTokenEnc: undefined, refreshTokenEnc: undefined };
      }

      const accessTokenEnc = encryptToken(input.accessToken);
      const [account] = await db
        .insert(socialAccounts)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: "instagram",
          platformAccountId: input.accountId,
          platformUsername: input.username,
          accessTokenEnc,
          isActive: true,
        })
        .returning();

      return { ...account, accessTokenEnc: undefined, refreshTokenEnc: undefined };
    }),

  connectTwitter: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        accountId: z.string(),
        accessToken: z.string(),
        username: z.string().optional(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, "twitter"),
          eq(socialAccounts.platformAccountId, input.accountId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (existing) {
        const accessTokenEnc = encryptToken(input.accessToken);
        const [updated] = await db
          .update(socialAccounts)
          .set({
            accessTokenEnc,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing.id))
          .returning();
        return { ...updated, accessTokenEnc: undefined, refreshTokenEnc: undefined };
      }

      const accessTokenEnc = encryptToken(input.accessToken);
      const [account] = await db
        .insert(socialAccounts)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: "twitter",
          platformAccountId: input.accountId,
          platformUsername: input.username,
          accessTokenEnc,
          isActive: true,
        })
        .returning();

      return { ...account, accessTokenEnc: undefined, refreshTokenEnc: undefined };
    }),

  connectWhatsApp: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        phoneNumberId: z.string(),
        accessToken: z.string(),
        businessAccountId: z.string().optional(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, "whatsapp"),
          eq(socialAccounts.platformAccountId, input.phoneNumberId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (existing) {
        const accessTokenEnc = encryptToken(input.accessToken);
        const [updated] = await db
          .update(socialAccounts)
          .set({
            accessTokenEnc,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing.id))
          .returning();
        return { ...updated, accessTokenEnc: undefined, refreshTokenEnc: undefined };
      }

      const accessTokenEnc = encryptToken(input.accessToken);
      const [account] = await db
        .insert(socialAccounts)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: "whatsapp",
          platformAccountId: input.phoneNumberId,
          platformUsername: input.businessAccountId,
          accessTokenEnc,
          isActive: true,
        })
        .returning();

      return { ...account, accessTokenEnc: undefined, refreshTokenEnc: undefined };
    }),

  disconnect: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        deletedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(socialAccounts)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(socialAccounts.id, input.id),
            eq(socialAccounts.organizationId, input.organizationId),
          ),
        );

      return { success: true };
    }),

  refreshToken: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.id, input.id),
          eq(socialAccounts.organizationId, input.organizationId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      if (!account.refreshTokenEnc) {
        throw new Error("No refresh token available");
      }

      const refreshToken = decryptToken(account.refreshTokenEnc);
      const { refreshSocialToken } = await import("../services/socialTokenRefresh");

      const newTokens = await refreshSocialToken(account.platform, refreshToken);

      const accessTokenEnc = encryptToken(newTokens.accessToken);
      const refreshTokenEnc = newTokens.refreshToken
        ? encryptToken(newTokens.refreshToken)
        : undefined;

      const [updated] = await db
        .update(socialAccounts)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: newTokens.expiresAt ? new Date(newTokens.expiresAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, input.id))
        .returning();

      return { ...updated, accessTokenEnc: undefined, refreshTokenEnc: undefined };
    }),

  getStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.id, input.id),
          eq(socialAccounts.organizationId, input.organizationId),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Account not found");
      }

      let isValid = false;
      let error: string | null = null;

      try {
        const { validateSocialToken } = await import("../services/socialTokenRefresh");
        const token = decryptToken(account.accessTokenEnc);
        isValid = await validateSocialToken(account.platform, token);
      } catch (e) {
        error = e instanceof Error ? e.message : "Token validation failed";
      }

      return {
        isActive: account.isActive,
        isValid,
        error,
        tokenExpiresAt: account.tokenExpiresAt,
        updatedAt: account.updatedAt,
      };
    }),
};
