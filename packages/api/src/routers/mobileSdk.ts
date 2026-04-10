import { db } from "@ticket-app/db";
import {
  mobileSdkConfigs,
  contactPushTokens,
  pushNotificationLogs,
  contacts,
} from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { sendFCMNotification } from "../lib/fcm";
import { sendAPNsNotification } from "../lib/apns";

export const mobileSdkRouter = {
  listConfigs: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Mobile SDK read permission required");
      }

      return await db
        .select()
        .from(mobileSdkConfigs)
        .where(eq(mobileSdkConfigs.organizationId, input.organizationId))
        .orderBy(desc(mobileSdkConfigs.createdAt));
    }),

  getConfig: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Mobile SDK read permission required");
      }

      const [config] = await db
        .select()
        .from(mobileSdkConfigs)
        .where(eq(mobileSdkConfigs.id, input.id));
      return config ?? null;
    }),

  createConfig: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        platform: z.enum(["ios", "android"]),
        appBundleId: z.string(),
        fcmServerKey: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isEnabled: z.coerce.boolean().default(true),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

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

  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        appBundleId: z.string().optional(),
        fcmServerKey: z.string().optional(),
        apnsKeyId: z.string().optional(),
        apnsTeamId: z.string().optional(),
        apnsKey: z.string().optional(),
        apnsBundleId: z.string().optional(),
        isEnabled: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

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

  deleteConfig: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

      await db.delete(mobileSdkConfigs).where(eq(mobileSdkConfigs.id, input.id));
      return { success: true };
    }),

  registerToken: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactId: z.coerce.number(),
        platform: z.enum(["ios", "android"]),
        token: z.string(),
        deviceId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

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

  listTokens: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number(), contactId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Mobile SDK read permission required");
      }

      return await db
        .select()
        .from(contactPushTokens)
        .where(eq(contactPushTokens.contactId, input.contactId))
        .orderBy(desc(contactPushTokens.createdAt));
    }),

  deleteToken: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

      await db.delete(contactPushTokens).where(eq(contactPushTokens.id, input.id));
      return { success: true };
    }),

  sendPushNotification: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactId: z.coerce.number(),
        title: z.string(),
        body: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
        ticketId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

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
                input.data,
              )
            : await sendAPNsNotification(
                contact.organizationId,
                token.token,
                input.title,
                input.body,
                input.data,
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

  sendBatchPushNotification: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactIds: z.array(z.coerce.number()),
        title: z.string(),
        body: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
        ticketId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Mobile SDK write permission required");
      }

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
                  input.data,
                )
              : await sendAPNsNotification(
                  contact.organizationId,
                  token.token,
                  input.title,
                  input.body,
                  input.data,
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

  listNotificationLogs: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        contactId: z.coerce.number().optional(),
        limit: z.coerce.number().default(50),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Mobile SDK read permission required");
      }

      const conditions = input.contactId
        ? [eq(pushNotificationLogs.contactId, input.contactId)]
        : [];
      return await db
        .select()
        .from(pushNotificationLogs)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(desc(pushNotificationLogs.createdAt))
        .limit(input.limit);
    }),
};
