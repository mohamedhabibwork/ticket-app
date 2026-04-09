import { db } from "@ticket-app/db";
import { mobileSdkConfigs, contactPushTokens, pushNotificationLogs } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const mobileSdkRouter = {
  listConfigs: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(mobileSdkConfigs)
        .where(eq(mobileSdkConfigs.organizationId, input.organizationId))
        .orderBy(desc(mobileSdkConfigs.createdAt));
    }),

  getConfig: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [config] = await db
        .select()
        .from(mobileSdkConfigs)
        .where(eq(mobileSdkConfigs.id, input.id));
      return config ?? null;
    }),

  createConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        platform: z.enum(["ios", "android"]),
        fcmProjectId: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsPrivateKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isActive: z.boolean().default(true),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [config] = await db
        .insert(mobileSdkConfigs)
        .values({
          organizationId: input.organizationId,
          platform: input.platform,
          fcmProjectId: input.fcmProjectId,
          apnsKeyId: input.apnsKeyId,
          apnsTeamId: input.apnsTeamId,
          apnsPrivateKey: input.apnsPrivateKey,
          apnsBundleId: input.apnsBundleId,
          isActive: input.isActive,
          createdBy: input.createdBy,
        })
        .returning();
      return config;
    }),

  updateConfig: publicProcedure
    .input(
      z.object({
        id: z.number(),
        fcmProjectId: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsPrivateKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(mobileSdkConfigs)
        .set({
          fcmProjectId: input.fcmProjectId,
          apnsKeyId: input.apnsKeyId,
          apnsTeamId: input.apnsTeamId,
          apnsPrivateKey: input.apnsPrivateKey,
          apnsBundleId: input.apnsBundleId,
          isActive: input.isActive,
        })
        .where(eq(mobileSdkConfigs.id, input.id))
        .returning();
      return updated;
    }),

  deleteConfig: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(mobileSdkConfigs).where(eq(mobileSdkConfigs.id, input.id));
      return { success: true };
    }),

  registerToken: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        configId: z.number(),
        deviceToken: z.string(),
        deviceName: z.string().optional(),
        deviceModel: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [token] = await db
        .insert(contactPushTokens)
        .values({
          contactId: input.contactId,
          configId: input.configId,
          deviceToken: input.deviceToken,
          deviceName: input.deviceName,
          deviceModel: input.deviceModel,
        })
        .returning();
      return token;
    }),

  listTokens: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(contactPushTokens)
        .where(eq(contactPushTokens.contactId, input.contactId))
        .orderBy(desc(contactPushTokens.createdAt));
    }),

  deleteToken: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(contactPushTokens).where(eq(contactPushTokens.id, input.id));
      return { success: true };
    }),

  listNotificationLogs: publicProcedure
    .input(z.object({ contactId: z.number().optional(), limit: z.number().default(50) }))
    .handler(async ({ input }) => {
      const conditions = input.contactId ? [eq(pushNotificationLogs.contactId, input.contactId)] : [];
      return await db
        .select()
        .from(pushNotificationLogs)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(desc(pushNotificationLogs.createdAt))
        .limit(input.limit);
    }),
};
