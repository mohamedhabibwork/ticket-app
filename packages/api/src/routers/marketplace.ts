import { db } from "@ticket-app/db";
import { marketplaceAccounts, marketplaceMessages } from "@ticket-app/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { encryptToken, decryptToken } from "../lib/crypto";

export const marketplaceRouter = {
  listAccounts: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Marketplace read permission required");
      }

      const accounts = await db.query.marketplaceAccounts.findMany({
        where: and(
          eq(marketplaceAccounts.organizationId, input.organizationId),
          isNull(marketplaceAccounts.deletedAt),
        ),
        orderBy: [desc(marketplaceAccounts.createdAt)],
      });

      return accounts.map((account) => ({
        ...account,
        spApiClientIdEnc: undefined,
        spApiClientSecretEnc: undefined,
        spApiRefreshTokenEnc: undefined,
      }));
    }),

  getAccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Marketplace read permission required");
      }

      const account = await db.query.marketplaceAccounts.findFirst({
        where: and(
          eq(marketplaceAccounts.id, input.id),
          eq(marketplaceAccounts.organizationId, input.organizationId),
          isNull(marketplaceAccounts.deletedAt),
        ),
      });

      if (!account) return null;

      return {
        ...account,
        spApiClientIdEnc: undefined,
        spApiClientSecretEnc: undefined,
        spApiRefreshTokenEnc: undefined,
      };
    }),

  connectMarketplace: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        platform: z.string().default("amazon_seller"),
        accountName: z.string(),
        sellerId: z.string(),
        marketplaceId: z.string(),
        spApiClientId: z.string(),
        spApiClientSecret: z.string(),
        spApiRefreshToken: z.string(),
        userId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Marketplace write permission required");
      }

      const existingAccount = await db.query.marketplaceAccounts.findFirst({
        where: and(
          eq(marketplaceAccounts.organizationId, input.organizationId),
          eq(marketplaceAccounts.sellerId, input.sellerId),
          eq(marketplaceAccounts.marketplaceId, input.marketplaceId),
          isNull(marketplaceAccounts.deletedAt),
        ),
      });

      const spApiClientIdEnc = encryptToken(input.spApiClientId);
      const spApiClientSecretEnc = encryptToken(input.spApiClientSecret);
      const spApiRefreshTokenEnc = encryptToken(input.spApiRefreshToken);

      if (existingAccount) {
        const [updated] = await db
          .update(marketplaceAccounts)
          .set({
            accountName: input.accountName,
            spApiClientIdEnc,
            spApiClientSecretEnc,
            spApiRefreshTokenEnc,
            status: "active",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(marketplaceAccounts.id, existingAccount.id))
          .returning();

        return {
          ...updated,
          spApiClientIdEnc: undefined,
          spApiClientSecretEnc: undefined,
          spApiRefreshTokenEnc: undefined,
        };
      }

      const [account] = await db
        .insert(marketplaceAccounts)
        .values({
          organizationId: input.organizationId,
          platform: input.platform,
          accountName: input.accountName,
          sellerId: input.sellerId,
          marketplaceId: input.marketplaceId,
          spApiClientIdEnc,
          spApiClientSecretEnc,
          spApiRefreshTokenEnc,
          status: "active",
          lastSyncedAt: new Date(),
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .returning();

      return {
        ...account,
        spApiClientIdEnc: undefined,
        spApiClientSecretEnc: undefined,
        spApiRefreshTokenEnc: undefined,
      };
    }),

  updateAccount: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        accountName: z.string().optional(),
        spApiClientId: z.string().optional(),
        spApiClientSecret: z.string().optional(),
        spApiRefreshToken: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Marketplace write permission required");
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.accountName) updateData.accountName = input.accountName;
      if (input.spApiClientId) updateData.spApiClientIdEnc = encryptToken(input.spApiClientId);
      if (input.spApiClientSecret)
        updateData.spApiClientSecretEnc = encryptToken(input.spApiClientSecret);
      if (input.spApiRefreshToken)
        updateData.spApiRefreshTokenEnc = encryptToken(input.spApiRefreshToken);
      if (input.isActive !== undefined) updateData.status = input.isActive ? "active" : "inactive";

      const [account] = await db
        .update(marketplaceAccounts)
        .set(updateData)
        .where(
          and(
            eq(marketplaceAccounts.id, input.id),
            eq(marketplaceAccounts.organizationId, input.organizationId),
          ),
        )
        .returning();

      if (!account) return null;

      return {
        ...account,
        spApiClientIdEnc: undefined,
        spApiClientSecretEnc: undefined,
        spApiRefreshTokenEnc: undefined,
      };
    }),

  disconnect: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Marketplace write permission required");
      }

      await db
        .update(marketplaceAccounts)
        .set({
          deletedAt: new Date(),
          status: "inactive",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(marketplaceAccounts.id, input.id),
            eq(marketplaceAccounts.organizationId, input.organizationId),
          ),
        );

      return { success: true };
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        accountId: z.coerce.number(),
        ticketId: z.coerce.number().optional(),
        limit: z.coerce.number().default(50),
        offset: z.coerce.number().default(0),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Marketplace read permission required");
      }

      const conditions = [eq(marketplaceMessages.marketplaceAccountId, input.accountId)];

      if (input.ticketId) {
        conditions.push(eq(marketplaceMessages.ticketId, input.ticketId));
      }

      const messages = await db.query.marketplaceMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(marketplaceMessages.receivedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return messages;
    }),

  markMessageRead: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Marketplace write permission required");
      }

      await db
        .update(marketplaceMessages)
        .set({
          createdAt: new Date(),
        })
        .where(eq(marketplaceMessages.id, input.id));

      return { success: true };
    }),

  getDecryptedCredentials: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Marketplace read permission required");
      }

      const account = await db.query.marketplaceAccounts.findFirst({
        where: and(
          eq(marketplaceAccounts.id, input.id),
          eq(marketplaceAccounts.organizationId, input.organizationId),
          isNull(marketplaceAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Marketplace account not found");
      }

      return {
        spApiClientId: account.spApiClientIdEnc
          ? decryptToken(account.spApiClientIdEnc)
          : undefined,
        spApiClientSecret: account.spApiClientSecretEnc
          ? decryptToken(account.spApiClientSecretEnc)
          : undefined,
        spApiRefreshToken: account.spApiRefreshTokenEnc
          ? decryptToken(account.spApiRefreshTokenEnc)
          : undefined,
        lastSyncedAt: account.lastSyncedAt,
      };
    }),
};
