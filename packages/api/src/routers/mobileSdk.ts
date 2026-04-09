import { db } from "@ticket-app/db";
import { mobileSdkConfigs, contactPushTokens, pushNotificationLogs, contacts } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { sendFCMNotification, sendFCMBatch } from "../lib/fcm";
import { sendAPNsNotification, sendAPNsBatch } from "../lib/apns";

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
        appBundleId: z.string(),
        fcmServerKey: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isEnabled: z.boolean().default(true),
      })
    )
    .handler(async ({ input }) => {
      const [config] = await db
        .insert(mobileSdkConfigs)
        .values({
          organizationId: input.organizationId,
          platform: input.platform,
          appBundleId: input.appBundleId,
          fcmServerKey: input.fcmServerKey,
          apnsKeyId: input.apnsKeyId,
          apnsTeamId: input.apnsTeamId,
          apnsKey: input.apnsKey,
          apnsBundleId: input.apnsBundleId,
          isEnabled: input.isEnabled,
        })
        .returning();
      return config;
    }),

  updateConfig: publicProcedure
    .input(
      z.object({
        id: z.number(),
        appBundleId: z.string().optional(),
        fcmServerKey: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(mobileSdkConfigs)
        .set({
          appBundleId: input.appBundleId,
          fcmServerKey: input.fcmServerKey,
          apnsKeyId: input.apnsKeyId,
          apnsTeamId: input.apnsTeamId,
          apnsKey: input.apnsKey,
          apnsBundleId: input.apnsBundleId,
          isEnabled: input.isEnabled,
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
        platform: z.enum(["ios", "android"]),
        token: z.string(),
        deviceId: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const existing = await db.query.contactPushTokens.findFirst({
        where: eq(contactPushTokens.token, input.token),
      });

      if (existing) {
        await db
          .update(contactPushTokens)
          .set({
            isActive: true,
            lastUsedAt: new Date(),
          })
          .where(eq(contactPushTokens.id, existing.id));
        return existing;
      }

      const [newToken] = await db
        .insert(contactPushTokens)
        .values({
          contactId: input.contactId,
          platform: input.platform,
          token: input.token,
          deviceId: input.deviceId,
          isActive: true,
        })
        .returning();
      return newToken;
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

  sendPushNotification: publicProcedure
    .input(
      z.object({
        contactId: z.number(),
        title: z.string(),
        body: z.string(),
        data: z.record(z.any()).optional(),
        ticketId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, input.contactId),
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      const tokens = await db.query.contactPushTokens.findMany({
        where: eq(contactPushTokens.contactId, input.contactId),
      });

      if (tokens.length === 0) {
        return { success: false, error: "No push tokens found for contact" };
      }

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const token of tokens) {
        const result =
          token.platform === "android"
            ? await sendFCMNotification(
                contact.organizationId,
                token.token,
                input.title,
                input.body,
                input.data
              )
            : await sendAPNsNotification(
                contact.organizationId,
                token.token,
                input.title,
                input.body,
                input.data
              );

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          if (result.error) errors.push(result.error);
        }

        await db.insert(pushNotificationLogs).values({
          contactId: input.contactId,
          pushTokenId: token.id,
          ticketId: input.ticketId,
          title: input.title,
          body: input.body,
          data: input.data as any,
          status: result.success ? "sent" : "failed",
          errorMessage: result.error,
          sentAt: new Date(),
        });
      }

      return { successCount, failureCount, errors };
    }),

  sendBatchPushNotification: publicProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()),
        title: z.string(),
        body: z.string(),
        data: z.record(z.any()).optional(),
        ticketId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      let totalSuccess = 0;
      let totalFailure = 0;
      const errors: string[] = [];

      for (const contactId of input.contactIds) {
        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, contactId),
        });

        if (!contact) continue;

        const tokens = await db.query.contactPushTokens.findMany({
          where: eq(contactPushTokens.contactId, contactId),
        });

        for (const token of tokens) {
          const result =
            token.platform === "android"
              ? await sendFCMNotification(
                  contact.organizationId,
                  token.token,
                  input.title,
                  input.body,
                  input.data
                )
              : await sendAPNsNotification(
                  contact.organizationId,
                  token.token,
                  input.title,
                  input.body,
                  input.data
                );

          if (result.success) {
            totalSuccess++;
          } else {
            totalFailure++;
            if (result.error) errors.push(result.error);
          }

          await db.insert(pushNotificationLogs).values({
            contactId,
            pushTokenId: token.id,
            ticketId: input.ticketId,
            title: input.title,
            body: input.body,
            data: input.data as any,
            status: result.success ? "sent" : "failed",
            errorMessage: result.error,
            sentAt: new Date(),
          });
        }
      }

      return { successCount: totalSuccess, failureCount: totalFailure, errors };
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
