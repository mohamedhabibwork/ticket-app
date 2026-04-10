import { db } from "@ticket-app/db";
import { chatWidgets } from "@ticket-app/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const chatWidgetsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.chatWidgets.findMany({
        where: and(
          eq(chatWidgets.organizationId, input.organizationId),
          isNull(chatWidgets.deletedAt),
        ),
        orderBy: (chatWidgets, { desc }) => [desc(chatWidgets.createdAt)],
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.chatWidgets.findFirst({
        where: and(
          eq(chatWidgets.id, input.id),
          eq(chatWidgets.organizationId, input.organizationId),
          isNull(chatWidgets.deletedAt),
        ),
      });
    }),

  getByUuid: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.chatWidgets.findFirst({
        where: and(
          eq(chatWidgets.uuid, input.uuid),
          eq(chatWidgets.isActive, true),
          isNull(chatWidgets.deletedAt),
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150),
        position: z.string().default("bottom-right"),
        theme: z
          .object({
            primaryColor: z.string().optional(),
            backgroundColor: z.string().optional(),
            fontFamily: z.string().optional(),
          })
          .optional(),
        preChatFormFields: z
          .array(
            z.object({
              name: z.string(),
              label: z.string(),
              type: z.string(),
              required: z.coerce.boolean().optional(),
              placeholder: z.string().optional(),
            }),
          )
          .optional(),
        offlineMessageEnabled: z.coerce.boolean().optional(),
        offlineMessageTitle: z.string().optional(),
        offlineMessageBody: z.string().optional(),
        businessHours: z
          .object({
            enabled: z.coerce.boolean().optional(),
            timezone: z.string().optional(),
            schedule: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
        allowFileUpload: z.coerce.boolean().optional(),
        maxFileSizeBytes: z.coerce.number().optional(),
        allowedFileTypes: z.array(z.string()).optional(),
        autoTicketConversion: z.coerce.boolean().optional(),
        greetingMessage: z.string().optional(),
        agentUnavailableMessage: z.string().optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [widget] = await db
        .insert(chatWidgets)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          position: input.position,
          theme: input.theme ?? {},
          preChatFormFields: input.preChatFormFields ?? [],
          offlineMessageEnabled: input.offlineMessageEnabled ?? true,
          offlineMessageTitle: input.offlineMessageTitle,
          offlineMessageBody: input.offlineMessageBody,
          businessHours: input.businessHours ?? {
            enabled: false,
            timezone: "UTC",
            schedule: {},
          },
          allowFileUpload: input.allowFileUpload ?? true,
          maxFileSizeBytes: input.maxFileSizeBytes ?? 10485760,
          allowedFileTypes: input.allowedFileTypes ?? [
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
          ],
          autoTicketConversion: input.autoTicketConversion ?? true,
          greetingMessage: input.greetingMessage,
          agentUnavailableMessage: input.agentUnavailableMessage,
          createdBy: input.createdBy,
        })
        .returning();

      return widget;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150).optional(),
        isActive: z.coerce.boolean().optional(),
        position: z.string().optional(),
        theme: z
          .object({
            primaryColor: z.string().optional(),
            backgroundColor: z.string().optional(),
            fontFamily: z.string().optional(),
          })
          .optional(),
        preChatFormFields: z
          .array(
            z.object({
              name: z.string(),
              label: z.string(),
              type: z.string(),
              required: z.coerce.boolean().optional(),
              placeholder: z.string().optional(),
            }),
          )
          .optional(),
        offlineMessageEnabled: z.coerce.boolean().optional(),
        offlineMessageTitle: z.string().optional(),
        offlineMessageBody: z.string().optional(),
        businessHours: z
          .object({
            enabled: z.coerce.boolean().optional(),
            timezone: z.string().optional(),
            schedule: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
        allowFileUpload: z.coerce.boolean().optional(),
        maxFileSizeBytes: z.coerce.number().optional(),
        allowedFileTypes: z.array(z.string()).optional(),
        autoTicketConversion: z.coerce.boolean().optional(),
        greetingMessage: z.string().optional(),
        agentUnavailableMessage: z.string().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatWidgets)
        .set({
          name: input.name,
          isActive: input.isActive,
          position: input.position,
          theme: input.theme,
          preChatFormFields: input.preChatFormFields,
          offlineMessageEnabled: input.offlineMessageEnabled,
          offlineMessageTitle: input.offlineMessageTitle,
          offlineMessageBody: input.offlineMessageBody,
          businessHours: input.businessHours,
          allowFileUpload: input.allowFileUpload,
          maxFileSizeBytes: input.maxFileSizeBytes,
          allowedFileTypes: input.allowedFileTypes,
          autoTicketConversion: input.autoTicketConversion,
          greetingMessage: input.greetingMessage,
          agentUnavailableMessage: input.agentUnavailableMessage,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(
          and(eq(chatWidgets.id, input.id), eq(chatWidgets.organizationId, input.organizationId)),
        )
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        deletedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(chatWidgets)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(
          and(eq(chatWidgets.id, input.id), eq(chatWidgets.organizationId, input.organizationId)),
        );

      return { success: true };
    }),
};
