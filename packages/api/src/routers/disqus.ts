import { db } from "@ticket-app/db";
import { disqusAccounts } from "@ticket-app/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { encryptToken, decryptToken } from "../lib/crypto";
import { createDisqusClient } from "../lib/disqus";

export const disqusRouter = {
  listAccounts: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Disqus read permission required");
      }

      const accounts = await db.query.disqusAccounts.findMany({
        where: and(
          eq(disqusAccounts.organizationId, input.organizationId),
          isNull(disqusAccounts.deletedAt),
        ),
        orderBy: [desc(disqusAccounts.createdAt)],
      });

      return accounts.map((account) => ({
        ...account,
        accessTokenEnc: undefined,
        apiKeyEnc: undefined,
        apiSecretEnc: undefined,
      }));
    }),

  getAccount: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Disqus read permission required");
      }

      const account = await db.query.disqusAccounts.findFirst({
        where: and(
          eq(disqusAccounts.id, input.id),
          eq(disqusAccounts.organizationId, input.organizationId),
          isNull(disqusAccounts.deletedAt),
        ),
      });

      if (!account) return null;

      return {
        ...account,
        accessTokenEnc: undefined,
        apiKeyEnc: undefined,
        apiSecretEnc: undefined,
      };
    }),

  connectDisqusForum: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        forumShortname: z.string(),
        apiKey: z.string(),
        apiSecret: z.string(),
        accessToken: z.string().optional(),
        userId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Disqus write permission required");
      }

      const client = createDisqusClient({
        apiKey: input.apiKey,
        apiSecret: input.apiSecret,
        accessToken: input.accessToken,
      });

      try {
        await client.getForumDetails(input.forumShortname);
      } catch (error) {
        console.error("Disqus validation error:", error);
        throw new Error("Failed to validate Disqus credentials");
      }

      const existingAccount = await db.query.disqusAccounts.findFirst({
        where: and(
          eq(disqusAccounts.organizationId, input.organizationId),
          eq(disqusAccounts.forumShortname, input.forumShortname),
          isNull(disqusAccounts.deletedAt),
        ),
      });

      const apiKeyEnc = encryptToken(input.apiKey);
      const apiSecretEnc = encryptToken(input.apiSecret);
      const accessTokenEnc = input.accessToken ? encryptToken(input.accessToken) : null;

      if (existingAccount) {
        const [updated] = await db
          .update(disqusAccounts)
          .set({
            apiKeyEnc,
            apiSecretEnc,
            accessTokenEnc,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(disqusAccounts.id, existingAccount.id))
          .returning();

        return {
          ...updated,
          accessTokenEnc: undefined,
          apiKeyEnc: undefined,
          apiSecretEnc: undefined,
        };
      }

      const [account] = await db
        .insert(disqusAccounts)
        .values({
          organizationId: input.organizationId,
          forumShortname: input.forumShortname,
          apiKeyEnc,
          apiSecretEnc,
          accessTokenEnc,
          status: "active",
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .returning();

      return {
        ...account,
        accessTokenEnc: undefined,
        apiKeyEnc: undefined,
        apiSecretEnc: undefined,
      };
    }),

  updateAccount: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        accessToken: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Disqus write permission required");
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.apiKey) updateData.apiKeyEnc = encryptToken(input.apiKey);
      if (input.apiSecret) updateData.apiSecretEnc = encryptToken(input.apiSecret);
      if (input.accessToken !== undefined) {
        updateData.apiSecretEnc = input.accessToken ? encryptToken(input.accessToken) : null;
      }
      if (input.isActive !== undefined) updateData.status = input.isActive ? "active" : "inactive";

      const [account] = await db
        .update(disqusAccounts)
        .set(updateData)
        .where(
          and(
            eq(disqusAccounts.id, input.id),
            eq(disqusAccounts.organizationId, input.organizationId),
          ),
        )
        .returning();

      if (!account) return null;

      return {
        ...account,
        accessTokenEnc: undefined,
        apiKeyEnc: undefined,
        apiSecretEnc: undefined,
      };
    }),

  disconnect: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Disqus write permission required");
      }

      await db
        .update(disqusAccounts)
        .set({
          deletedAt: new Date(),
          status: "inactive",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(disqusAccounts.id, input.id),
            eq(disqusAccounts.organizationId, input.organizationId),
          ),
        );

      return { success: true };
    }),

  getDecryptedCredentials: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Disqus read permission required");
      }

      const account = await db.query.disqusAccounts.findFirst({
        where: and(
          eq(disqusAccounts.id, input.id),
          eq(disqusAccounts.organizationId, input.organizationId),
          isNull(disqusAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Disqus account not found");
      }

      return {
        apiKey: decryptToken(account.apiKeyEnc),
        apiSecret: decryptToken(account.apiSecretEnc),
        accessToken: account.accessTokenEnc ? decryptToken(account.accessTokenEnc) : undefined,
      };
    }),

  testConnection: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Disqus read permission required");
      }

      const account = await db.query.disqusAccounts.findFirst({
        where: and(
          eq(disqusAccounts.id, input.id),
          eq(disqusAccounts.organizationId, input.organizationId),
          isNull(disqusAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Disqus account not found");
      }

      try {
        const client = createDisqusClient({
          apiKey: decryptToken(account.apiKeyEnc),
          apiSecret: decryptToken(account.apiSecretEnc),
          accessToken: account.accessTokenEnc ? decryptToken(account.accessTokenEnc) : undefined,
        });

        await client.getForumDetails(account.forumShortname);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Connection test failed",
        };
      }
    }),

  replyToPost: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        threadId: z.string(),
        message: z.string(),
        authorEmail: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Disqus write permission required");
      }

      const account = await db.query.disqusAccounts.findFirst({
        where: and(
          eq(disqusAccounts.id, input.id),
          eq(disqusAccounts.organizationId, input.organizationId),
          eq(disqusAccounts.status, "active"),
          isNull(disqusAccounts.deletedAt),
        ),
      });

      if (!account) {
        throw new Error("Disqus account not found or inactive");
      }

      if (!account.accessTokenEnc) {
        throw new Error(
          "Disqus access token not configured. Please reconnect your Disqus account.",
        );
      }

      const client = createDisqusClient({
        apiKey: decryptToken(account.apiKeyEnc),
        apiSecret: decryptToken(account.apiSecretEnc),
        accessToken: decryptToken(account.accessTokenEnc),
      });

      try {
        const post = await client.createPost(input.threadId, input.message, input.authorEmail);

        return {
          success: true,
          postId: post.id,
          message: "Reply posted to Disqus successfully",
        };
      } catch (error) {
        console.error("Disqus reply error:", error);
        throw new Error(
          `Failed to post reply: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
};
