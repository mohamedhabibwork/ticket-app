import { db } from "@ticket-app/db";
import { mailboxes, mailboxAliases, mailboxRoutingRules, imapConfigs, smtpConfigs } from "@ticket-app/db/schema";
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

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        name: z.string().min(1).max(150).optional(),
        replyTo: z.string().email().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        autoReplyEnabled: z.boolean().optional(),
        autoReplySubject: z.string().optional(),
        autoReplyBodyHtml: z.string().optional(),
        defaultTeamId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(mailboxes)
        .set({
          name: input.name,
          replyTo: input.replyTo?.toLowerCase(),
          isActive: input.isActive,
          isDefault: input.isDefault,
          autoReplyEnabled: input.autoReplyEnabled,
          autoReplySubject: input.autoReplySubject,
          autoReplyBodyHtml: input.autoReplyBodyHtml,
          defaultTeamId: input.defaultTeamId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mailboxes.id, input.id),
            eq(mailboxes.organizationId, input.organizationId)
          )
        )
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
        .update(mailboxes)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mailboxes.id, input.id),
            eq(mailboxes.organizationId, input.organizationId)
          )
        );

      return { success: true };
    }),

  testConnection: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt)
        ),
        with: {
          imapConfig: true,
          smtpConfig: true,
        },
      });

      if (!mailbox) {
        return { success: false, error: "Mailbox not found" };
      }

      const results = {
        imap: { connected: false, error: null as string | null },
        smtp: { connected: false, error: null as string | null },
      };

      if (mailbox.imapConfig) {
        try {
          const { testImapConnection } = await import("../services/imapService");
          results.imap = await testImapConnection(mailbox.imapConfig);
        } catch (e) {
          results.imap.error = e instanceof Error ? e.message : "IMAP connection failed";
        }
      }

      if (mailbox.smtpConfig) {
        try {
          const { testSmtpConnection } = await import("../services/smtpService");
          results.smtp = await testSmtpConnection(mailbox.smtpConfig);
        } catch (e) {
          results.smtp.error = e instanceof Error ? e.message : "SMTP connection failed";
        }
      }

      return {
        success: results.imap.connected && results.smtp.connected,
        imap: results.imap,
        smtp: results.smtp,
      };
    }),

  configureImap: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        useSsl: z.boolean().default(true),
        useTls: z.boolean().default(false),
        folderMapping: z.record(z.string()).optional(),
      })
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId)
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { encryptPassword } = await import("../lib/crypto");

      const [config] = await db
        .insert(imapConfigs)
        .values({
          mailboxId: input.id,
          host: input.host,
          port: input.port,
          username: input.username,
          passwordEnc: encryptPassword(input.password),
          useSsl: input.useSsl,
          useTls: input.useTls,
          folderMapping: input.folderMapping ?? {},
        })
        .onConflictDoUpdate({
          target: imapConfigs.mailboxId,
          set: {
            host: input.host,
            port: input.port,
            username: input.username,
            passwordEnc: encryptPassword(input.password),
            useSsl: input.useSsl,
            useTls: input.useTls,
            folderMapping: input.folderMapping ?? {},
            updatedAt: new Date(),
          },
        })
        .returning();

      return config;
    }),

  configureSmtp: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        useSsl: z.boolean().default(true),
        useTls: z.boolean().default(false),
        fromName: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId)
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { encryptPassword } = await import("../lib/crypto");

      const [config] = await db
        .insert(smtpConfigs)
        .values({
          mailboxId: input.id,
          host: input.host,
          port: input.port,
          username: input.username,
          passwordEnc: encryptPassword(input.password),
          useSsl: input.useSsl,
          useTls: input.useTls,
          fromName: input.fromName,
        })
        .onConflictDoUpdate({
          target: smtpConfigs.mailboxId,
          set: {
            host: input.host,
            port: input.port,
            username: input.username,
            passwordEnc: encryptPassword(input.password),
            useSsl: input.useSsl,
            useTls: input.useTls,
            fromName: input.fromName,
            updatedAt: new Date(),
          },
        })
        .returning();

      return config;
    }),

  syncNow: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt)
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { queueEmailSync } = await import("../services/emailSyncQueue");
      await queueEmailSync(input.id);

      await db
        .update(mailboxes)
        .set({ updatedAt: new Date() })
        .where(eq(mailboxes.id, input.id));

      return { success: true, message: "Email sync queued" };
    }),

  getStatistics: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt)
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { getEmailStatistics } = await import("../services/emailStats");
      return await getEmailStatistics(input.id, input.startDate, input.endDate);
    }),

  addAlias: publicProcedure
    .input(
      z.object({
        mailboxId: z.number(),
        organizationId: z.number(),
        email: z.string().email(),
        name: z.string().optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .handler(async ({ input }) => {
      const [alias] = await db
        .insert(mailboxAliases)
        .values({
          mailboxId: input.mailboxId,
          email: input.email.toLowerCase(),
          name: input.name,
          isDefault: input.isDefault,
        })
        .returning();

      return alias;
    }),

  removeAlias: publicProcedure
    .input(
      z.object({
        aliasId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .delete(mailboxAliases)
        .where(eq(mailboxAliases.id, input.aliasId));

      return { success: true };
    }),

  createRoutingRule: publicProcedure
    .input(
      z.object({
        mailboxId: z.number(),
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        conditions: z.object({
          field: z.string(),
          operator: z.string(),
          value: z.unknown(),
        }).array(),
        conditionOperator: z.enum(["and", "or"]).default("and"),
        actions: z.array(z.object({
          type: z.string(),
          params: z.record(z.unknown()),
        })),
        priority: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .handler(async ({ input }) => {
      const [rule] = await db
        .insert(mailboxRoutingRules)
        .values({
          mailboxId: input.mailboxId,
          name: input.name,
          conditions: input.conditions,
          conditionOperator: input.conditionOperator,
          actions: input.actions,
          priority: input.priority,
          isActive: input.isActive,
        })
        .returning();

      return rule;
    }),

  updateRoutingRule: publicProcedure
    .input(
      z.object({
        ruleId: z.number(),
        name: z.string().min(1).max(150).optional(),
        conditions: z.object({
          field: z.string(),
          operator: z.string(),
          value: z.unknown(),
        }).array().optional(),
        conditionOperator: z.enum(["and", "or"]).optional(),
        actions: z.array(z.object({
          type: z.string(),
          params: z.record(z.unknown()),
        })).optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(mailboxRoutingRules)
        .set({
          name: input.name,
          conditions: input.conditions,
          conditionOperator: input.conditionOperator,
          actions: input.actions,
          priority: input.priority,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(mailboxRoutingRules.id, input.ruleId))
        .returning();

      return updated;
    }),

  deleteRoutingRule: publicProcedure
    .input(
      z.object({
        ruleId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .delete(mailboxRoutingRules)
        .where(eq(mailboxRoutingRules.id, input.ruleId));

      return { success: true };
    }),
};
