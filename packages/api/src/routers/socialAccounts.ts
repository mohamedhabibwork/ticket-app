import { db } from "@ticket-app/db";
import { socialAccounts } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { encryptToken, decryptToken } from "../lib/crypto";

export const socialAccountsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.string().optional(),
        isActive: z.boolean().optional(),
      })
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
      })
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.id, input.id),
          eq(socialAccounts.organizationId, input.organizationId),
          isNull(socialAccounts.deletedAt)
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
      })
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.organizationId, input.organizationId),
          eq(socialAccounts.platform, input.platform),
          eq(socialAccounts.platformAccountId, input.platformAccountId),
          isNull(socialAccounts.deletedAt)
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
      })
    )
    .handler(async ({ input }) => {
      const accessTokenEnc = encryptToken(input.accessToken);
      const refreshTokenEnc = input.refreshToken
        ? encryptToken(input.refreshToken)
        : null;

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
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : null,
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
      })
    )
    .handler(async ({ input }) => {
      const accessTokenEnc = encryptToken(input.accessToken);
      const refreshTokenEnc = input.refreshToken
        ? encryptToken(input.refreshToken)
        : undefined;

      const [account] = await db
        .update(socialAccounts)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : null,
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
      })
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
      })
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
      })
    )
    .handler(async ({ input }) => {
      const account = await db.query.socialAccounts.findFirst({
        where: eq(socialAccounts.id, input.id),
      });

      if (!account) return null;

      return {
        accessToken: decryptToken(account.accessTokenEnc),
        refreshToken: account.refreshTokenEnc
          ? decryptToken(account.refreshTokenEnc)
          : null,
        tokenExpiresAt: account.tokenExpiresAt,
      };
    }),
};
