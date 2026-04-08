import { db } from "@ticket-app/db";
import { mailboxes } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const mailboxesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(mailboxes.organizationId, input.organizationId),
        isNull(mailboxes.deletedAt),
      ];

      if (input.isActive !== undefined) {
        conditions.push(eq(mailboxes.isActive, input.isActive));
      }

      return await db.query.mailboxes.findMany({
        where: and(...conditions),
        orderBy: [desc(mailboxes.createdAt)],
        with: {
          imapConfig: true,
          smtpConfig: true,
        },
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
      return await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt)
        ),
        with: {
          imapConfig: true,
          smtpConfig: true,
          aliases: true,
        },
      });
    }),

  getDefault: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.organizationId, input.organizationId),
          eq(mailboxes.isDefault, true),
          eq(mailboxes.isActive, true),
          isNull(mailboxes.deletedAt)
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        email: z.string().email(),
        replyTo: z.string().email().optional(),
        connectionType: z.string(),
        isActive: z.boolean().default(true),
        isDefault: z.boolean().default(false),
        autoReplyEnabled: z.boolean().default(false),
        autoReplySubject: z.string().optional(),
        autoReplyBodyHtml: z.string().optional(),
        defaultTeamId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [mailbox] = await db
        .insert(mailboxes)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          email: input.email.toLowerCase(),
          replyTo: input.replyTo?.toLowerCase(),
          connectionType: input.connectionType,
          isActive: input.isActive,
          isDefault: input.isDefault,
          autoReplyEnabled: input.autoReplyEnabled,
          autoReplySubject: input.autoReplySubject,
          autoReplyBodyHtml: input.autoReplyBodyHtml,
          defaultTeamId: input.defaultTeamId,
        })
        .returning();

      return mailbox;
    }),
};
