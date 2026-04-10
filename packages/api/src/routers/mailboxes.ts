import { db } from "@ticket-app/db";
import {
  mailboxes,
  mailboxAliases,
  mailboxRoutingRules,
  mailboxImapConfigs,
  mailboxSmtpConfigs,
} from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { env } from "@ticket-app/env/server";
import { encryptToken } from "../lib/crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const IMAP_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

export const mailboxesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        isActive: z.coerce.boolean().optional(),
      }),
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
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
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
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.organizationId, input.organizationId),
          eq(mailboxes.isDefault, true),
          eq(mailboxes.isActive, true),
          isNull(mailboxes.deletedAt),
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150),
        email: z.string().email(),
        replyTo: z.string().email().optional(),
        connectionType: z.string(),
        isActive: z.coerce.boolean().default(true),
        isDefault: z.coerce.boolean().default(false),
        autoReplyEnabled: z.coerce.boolean().default(false),
        autoReplySubject: z.string().optional(),
        autoReplyBodyHtml: z.string().optional(),
        defaultTeamId: z.coerce.number().optional(),
      }),
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
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150).optional(),
        replyTo: z.string().email().optional(),
        isActive: z.coerce.boolean().optional(),
        isDefault: z.coerce.boolean().optional(),
        autoReplyEnabled: z.coerce.boolean().optional(),
        autoReplySubject: z.string().optional(),
        autoReplyBodyHtml: z.string().optional(),
        defaultTeamId: z.coerce.number().optional(),
      }),
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
        .where(and(eq(mailboxes.id, input.id), eq(mailboxes.organizationId, input.organizationId)))
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
        .update(mailboxes)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(mailboxes.id, input.id), eq(mailboxes.organizationId, input.organizationId)));

      return { success: true };
    }),

  testConnection: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
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
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        host: z.string(),
        port: z.coerce.number(),
        username: z.string(),
        password: z.string(),
        useSsl: z.coerce.boolean().default(true),
        useTls: z.coerce.boolean().default(false),
        folderMapping: z.record(z.string()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(eq(mailboxes.id, input.id), eq(mailboxes.organizationId, input.organizationId)),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { encryptPassword } = await import("../lib/crypto");

      const [config] = await db
        .insert(mailboxImapConfigs)
        .values({
          mailboxId: input.id,
          host: input.host,
          port: input.port,
          username: input.username,
          passwordEnc: encryptPassword(input.password),
          useSsl: input.useSsl,
        })
        .onConflictDoUpdate({
          target: mailboxImapConfigs.mailboxId,
          set: {
            host: input.host,
            port: input.port,
            username: input.username,
            passwordEnc: encryptPassword(input.password),
            useSsl: input.useSsl,
            updatedAt: new Date(),
          },
        })
        .returning();

      return config;
    }),

  configureSmtp: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        host: z.string(),
        port: z.coerce.number(),
        username: z.string(),
        password: z.string(),
        useSsl: z.coerce.boolean().default(true),
        useTls: z.coerce.boolean().default(false),
        fromName: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(eq(mailboxes.id, input.id), eq(mailboxes.organizationId, input.organizationId)),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { encryptPassword } = await import("../lib/crypto");

      const [config] = await db
        .insert(mailboxSmtpConfigs)
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
          target: mailboxSmtpConfigs.mailboxId,
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
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const { queueEmailSync } = await import("../services/emailSyncQueue");
      await queueEmailSync(input.id);

      await db.update(mailboxes).set({ updatedAt: new Date() }).where(eq(mailboxes.id, input.id));

      return { success: true, message: "Email sync queued" };
    }),

  getStatistics: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
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
        mailboxId: z.coerce.number(),
        organizationId: z.coerce.number(),
        email: z.string().email(),
        name: z.string().optional(),
        isDefault: z.coerce.boolean().default(false),
      }),
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
        aliasId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db.delete(mailboxAliases).where(eq(mailboxAliases.id, input.aliasId));

      return { success: true };
    }),

  createRoutingRule: publicProcedure
    .input(
      z.object({
        mailboxId: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150),
        conditions: z
          .object({
            field: z.string(),
            operator: z.string(),
            value: z.unknown(),
          })
          .array(),
        conditionOperator: z.enum(["and", "or"]).default("and"),
        actions: z.array(
          z.object({
            type: z.string(),
            params: z.record(z.string(), z.unknown()),
          }),
        ),
        priority: z.coerce.number().default(0),
        isActive: z.coerce.boolean().default(true),
      }),
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
        ruleId: z.coerce.number(),
        name: z.string().min(1).max(150).optional(),
        conditions: z
          .object({
            field: z.string(),
            operator: z.string(),
            value: z.unknown(),
          })
          .array()
          .optional(),
        conditionOperator: z.enum(["and", "or"]).optional(),
        actions: z
          .array(
            z.object({
              type: z.string(),
              params: z.record(z.string(), z.unknown()),
            }),
          )
          .optional(),
        priority: z.coerce.number().optional(),
        isActive: z.coerce.boolean().optional(),
      }),
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
        ruleId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db.delete(mailboxRoutingRules).where(eq(mailboxRoutingRules.id, input.ruleId));

      return { success: true };
    }),

  getGmailOAuthUrl: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const state = crypto.randomUUID();
      const redirectUri = `${env.CORS_ORIGIN}/api/mailboxes/gmail/callback`;

      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", IMAP_SCOPES.join(" "));
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      const { sessions } = await import("@ticket-app/db/lib/sessions");
      await sessions.set(
        `gmail_oauth_state:${state}`,
        {
          mailboxId: input.id,
          organizationId: input.organizationId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
        600,
      );

      return { authUrl: authUrl.toString(), state };
    }),

  handleGmailCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        state: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const { sessions } = await import("@ticket-app/db/lib/sessions");
      const storedState = await sessions.get(`gmail_oauth_state:${input.state}`);

      if (!storedState) {
        throw new Error("Invalid or expired state");
      }

      const stateData = storedState as { mailboxId: number; organizationId: number };
      await sessions.delete(`gmail_oauth_state:${input.state}`);

      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, stateData.mailboxId),
          eq(mailboxes.organizationId, stateData.organizationId),
          isNull(mailboxes.deletedAt),
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const redirectUri = `${env.CORS_ORIGIN}/api/mailboxes/gmail/callback`;

      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: input.code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokens: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
      } = await tokenResponse.json();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const encryptedAccessToken = encryptToken(tokens.access_token);
      const encryptedRefreshToken = encryptToken(tokens.refresh_token);

      await db
        .insert(mailboxImapConfigs)
        .values({
          mailboxId: mailbox.id,
          host: "imap.gmail.com",
          port: 993,
          username: mailbox.email,
          passwordEnc: "",
          useSsl: true,
          oauthTokenEnc: encryptedAccessToken,
          oauthRefreshTokenEnc: encryptedRefreshToken,
          oauthExpiresAt: expiresAt,
        })
        .onConflictDoUpdate({
          target: mailboxImapConfigs.mailboxId,
          set: {
            host: "imap.gmail.com",
            port: 993,
            username: mailbox.email,
            passwordEnc: "",
            useSsl: true,
            oauthTokenEnc: encryptedAccessToken,
            oauthRefreshTokenEnc: encryptedRefreshToken,
            oauthExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        });

      return { success: true, mailboxId: mailbox.id };
    }),

  configureImapOAuth: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        host: z.string().default("imap.gmail.com"),
        port: z.coerce.number().default(993),
        username: z.string(),
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
        ),
      });

      if (!mailbox) {
        throw new Error("Mailbox not found");
      }

      const expiresAt = new Date(Date.now() + input.expiresIn * 1000);
      const encryptedAccessToken = encryptToken(input.accessToken);
      const encryptedRefreshToken = encryptToken(input.refreshToken);

      const [config] = await db
        .insert(mailboxImapConfigs)
        .values({
          mailboxId: input.id,
          host: input.host,
          port: input.port,
          username: input.username,
          passwordEnc: "",
          useSsl: true,
          oauthTokenEnc: encryptedAccessToken,
          oauthRefreshTokenEnc: encryptedRefreshToken,
          oauthExpiresAt: expiresAt,
        })
        .onConflictDoUpdate({
          target: mailboxImapConfigs.mailboxId,
          set: {
            host: input.host,
            port: input.port,
            username: input.username,
            passwordEnc: "",
            useSsl: true,
            oauthTokenEnc: encryptedAccessToken,
            oauthRefreshTokenEnc: encryptedRefreshToken,
            oauthExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        })
        .returning();

      return config;
    }),

  refreshGmailToken: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, input.id),
          eq(mailboxes.organizationId, input.organizationId),
          isNull(mailboxes.deletedAt),
        ),
        with: {
          imapConfig: true,
        },
      });

      if (!mailbox || !mailbox.imapConfig) {
        throw new Error("Mailbox not found or not configured");
      }

      if (!mailbox.imapConfig.oauthRefreshTokenEnc) {
        throw new Error("No refresh token available");
      }

      const { refreshGmailAccessToken } = await import("../services/email");
      const result = await refreshGmailAccessToken(mailbox.id);

      if (!result) {
        throw new Error("Failed to refresh token");
      }

      return { success: true, expiresAt: result.expiresAt };
    }),
};
