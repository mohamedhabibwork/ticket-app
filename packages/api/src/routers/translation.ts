import { db } from "@ticket-app/db";
import { translationConfigs, translationCache } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { encryptToken, decryptToken } from "../lib/crypto";

export const translationRouter = {
  listConfigs: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const configs = await db.query.translationConfigs.findMany({
        where: and(
          eq(translationConfigs.organizationId, input.organizationId)
        ),
        orderBy: [desc(translationConfigs.createdAt)],
      });

      return configs.map((config) => ({
        ...config,
        apiKeyEnc: undefined,
      }));
    }),

  getConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const config = await db.query.translationConfigs.findFirst({
        where: and(
          eq(translationConfigs.organizationId, input.organizationId)
        ),
      });

      if (!config) return null;

      return {
        ...config,
        apiKeyEnc: undefined,
      };
    }),

  createConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        provider: z.enum(["google", "deepl"]).default("google"),
        apiKey: z.string(),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const existing = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (existing) {
        throw new Error("Translation config already exists for this organization. Use update instead.");
      }

      const apiKeyEnc = encryptToken(input.apiKey);

      const [config] = await db
        .insert(translationConfigs)
        .values({
          organizationId: input.organizationId,
          provider: input.provider,
          apiKeyEnc,
          isEnabled: true,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      return {
        ...config,
        apiKeyEnc: undefined,
      };
    }),

  updateConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        provider: z.enum(["google", "deepl"]).optional(),
        apiKey: z.string().optional(),
        isEnabled: z.boolean().optional(),
        updatedBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const existing = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (!existing) {
        throw new Error("Translation config not found");
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.provider) updateData.provider = input.provider;
      if (input.apiKey) updateData.apiKeyEnc = encryptToken(input.apiKey);
      if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;

      const [config] = await db
        .update(translationConfigs)
        .set(updateData)
        .where(eq(translationConfigs.id, existing.id))
        .returning();

      if (!config) return null;

      return {
        ...config,
        apiKeyEnc: undefined,
      };
    }),

  deleteConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const existing = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (!existing) {
        return { success: true };
      }

      await db
        .delete(translationConfigs)
        .where(eq(translationConfigs.id, existing.id));

      return { success: true };
    }),

  getDecryptedApiKey: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const config = await db.query.translationConfigs.findFirst({
        where: and(
          eq(translationConfigs.organizationId, input.organizationId),
          eq(translationConfigs.isEnabled, true)
        ),
      });

      if (!config || !config.apiKeyEnc) {
        throw new Error("Translation not configured or disabled");
      }

      return {
        apiKey: decryptToken(config.apiKeyEnc),
        provider: config.provider,
      };
    }),

  getUsageStats: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const config = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (!config) {
        return null;
      }

      return {
        provider: config.provider,
        isEnabled: config.isEnabled,
      };
    }),

  clearCache: publicProcedure
    .input(
      z.object({
        sourceHash: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .delete(translationCache)
        .where(eq(translationCache.sourceHash, input.sourceHash));

      return { success: true };
    }),
};