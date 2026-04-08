import { db } from "@ticket-app/db";
import { ecommerceStores } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const ecommerceStoresRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(ecommerceStores.organizationId, input.organizationId),
        isNull(ecommerceStores.deletedAt),
      ];

      if (input.platform) {
        conditions.push(eq(ecommerceStores.platform, input.platform));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(ecommerceStores.isActive, input.isActive));
      }

      return await db.query.ecommerceStores.findMany({
        where: and(...conditions),
        orderBy: [desc(ecommerceStores.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.ecommerceStores.findFirst({
        where: and(
          eq(ecommerceStores.id, input.id),
          eq(ecommerceStores.organizationId, input.organizationId),
          isNull(ecommerceStores.deletedAt)
        ),
      });
    }),

  getByPlatform: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.string(),
        shopDomain: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.ecommerceStores.findFirst({
        where: and(
          eq(ecommerceStores.organizationId, input.organizationId),
          eq(ecommerceStores.platform, input.platform),
          eq(ecommerceStores.shopDomain, input.shopDomain),
          isNull(ecommerceStores.deletedAt)
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
        platform: z.string().min(1),
        name: z.string().min(1).max(255),
        domain: z.string().optional(),
        apiKeyEnc: z.string().optional(),
        apiSecretEnc: z.string().optional(),
        accessTokenEnc: z.string().optional(),
        refreshTokenEnc: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        shopDomain: z.string().optional(),
        region: z.string().optional(),
        webhookSecretEnc: z.string().optional(),
        settings: z.record(z.any()).optional(),
      })
    )
    .handler(async ({ input }) => {
      const [store] = await db
        .insert(ecommerceStores)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          platform: input.platform,
          name: input.name,
          domain: input.domain,
          apiKeyEnc: input.apiKeyEnc,
          apiSecretEnc: input.apiSecretEnc,
          accessTokenEnc: input.accessTokenEnc,
          refreshTokenEnc: input.refreshTokenEnc,
          tokenExpiresAt: input.tokenExpiresAt,
          shopDomain: input.shopDomain,
          region: input.region,
          webhookSecretEnc: input.webhookSecretEnc,
          settings: input.settings ?? {},
        })
        .returning();

      return store;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        name: z.string().min(1).max(255).optional(),
        domain: z.string().optional(),
        apiKeyEnc: z.string().optional(),
        apiSecretEnc: z.string().optional(),
        accessTokenEnc: z.string().optional(),
        refreshTokenEnc: z.string().optional(),
        tokenExpiresAt: z.date().optional(),
        shopDomain: z.string().optional(),
        region: z.string().optional(),
        isActive: z.boolean().optional(),
        webhookSecretEnc: z.string().optional(),
        settings: z.record(z.any()).optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ecommerceStores)
        .set({
          name: input.name,
          domain: input.domain,
          apiKeyEnc: input.apiKeyEnc,
          apiSecretEnc: input.apiSecretEnc,
          accessTokenEnc: input.accessTokenEnc,
          refreshTokenEnc: input.refreshTokenEnc,
          tokenExpiresAt: input.tokenExpiresAt,
          shopDomain: input.shopDomain,
          region: input.region,
          isActive: input.isActive,
          webhookSecretEnc: input.webhookSecretEnc,
          settings: input.settings,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ecommerceStores.id, input.id),
            eq(ecommerceStores.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  updateSyncStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        syncStatus: z.string(),
        lastSyncAt: z.date().optional(),
        syncError: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ecommerceStores)
        .set({
          syncStatus: input.syncStatus,
          lastSyncAt: input.lastSyncAt ?? new Date(),
          syncError: input.syncError,
          updatedAt: new Date(),
        })
        .where(eq(ecommerceStores.id, input.id))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        deletedBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .update(ecommerceStores)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
          isActive: false,
        })
        .where(
          and(
            eq(ecommerceStores.id, input.id),
            eq(ecommerceStores.organizationId, input.organizationId)
          )
        );

      return { success: true };
    }),

  refresh: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const store = await db.query.ecommerceStores.findFirst({
        where: and(
          eq(ecommerceStores.id, input.id),
          eq(ecommerceStores.organizationId, input.organizationId),
          isNull(ecommerceStores.deletedAt)
        ),
      });

      if (!store) {
        throw new Error("Store not found");
      }

      await db
        .update(ecommerceStores)
        .set({
          syncStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(ecommerceStores.id, input.id));

      return { success: true, message: "Sync job queued" };
    }),
};
