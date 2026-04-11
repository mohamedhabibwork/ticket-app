import { db } from "@ticket-app/db";
import { translationConfigs, translationCache } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { encryptToken, decryptToken } from "../lib/crypto";
import { translateText } from "../lib/translation";

export const translationRouter = {
  listConfigs: protectedProcedure
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
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Translation read permission required");
      }

      const configs = await db.query.translationConfigs.findMany({
        where: and(eq(translationConfigs.organizationId, input.organizationId)),
        orderBy: [desc(translationConfigs.createdAt)],
      });

      return configs.map((config) => ({
        ...config,
        apiKeyEnc: undefined,
      }));
    }),

  getConfig: protectedProcedure
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
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Translation read permission required");
      }

      const config = await db.query.translationConfigs.findFirst({
        where: and(eq(translationConfigs.organizationId, input.organizationId)),
      });

      if (!config) return null;

      return {
        ...config,
        apiKeyEnc: undefined,
      };
    }),

  createConfig: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        provider: z.enum(["google", "deepl"]).default("google"),
        apiKey: z.string(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Translation write permission required");
      }

      const existing = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (existing) {
        throw new Error(
          "Translation config already exists for this organization. Use update instead.",
        );
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

  updateConfig: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        provider: z.enum(["google", "deepl"]).optional(),
        apiKey: z.string().optional(),
        isEnabled: z.coerce.boolean().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Translation write permission required");
      }

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

  deleteConfig: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Translation write permission required");
      }

      const existing = await db.query.translationConfigs.findFirst({
        where: eq(translationConfigs.organizationId, input.organizationId),
      });

      if (!existing) {
        return { success: true };
      }

      await db.delete(translationConfigs).where(eq(translationConfigs.id, existing.id));

      return { success: true };
    }),

  getDecryptedApiKey: protectedProcedure
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
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Translation read permission required");
      }

      const config = await db.query.translationConfigs.findFirst({
        where: and(
          eq(translationConfigs.organizationId, input.organizationId),
          eq(translationConfigs.isEnabled, true),
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

  getUsageStats: protectedProcedure
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
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Translation read permission required");
      }

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

  clearCache: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        sourceHash: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Translation write permission required");
      }

      await db.delete(translationCache).where(eq(translationCache.sourceHash, input.sourceHash));

      return { success: true };
    }),

  translateText: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        text: z.string(),
        sourceLang: z.string().default("auto"),
        targetLang: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Translation write permission required");
      }

      const result = await translateText({
        text: input.text,
        sourceLang: input.sourceLang,
        targetLang: input.targetLang,
        organizationId: input.organizationId,
      });

      return result;
    }),
};
