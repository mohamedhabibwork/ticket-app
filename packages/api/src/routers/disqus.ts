import { db } from "@ticket-app/db";
import { disqusAccounts } from "@ticket-app/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { encryptToken, decryptToken } from "../lib/crypto";
import { createDisqusClient } from "../lib/disqus";

export const disqusRouter = {
  listAccounts: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

  getAccount: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

  connectDisqusForum: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        forumShortname: z.string(),
        apiKey: z.string(),
        apiSecret: z.string(),
        accessToken: z.string().optional(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
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

  updateAccount: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        accessToken: z.string().optional(),
        isActive: z.boolean().optional(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.apiKey) updateData.apiKeyEnc = encryptToken(input.apiKey);
      if (input.apiSecret) updateData.apiSecretEnc = encryptToken(input.apiSecret);
      if (input.accessToken !== undefined) {
        updateData.accessTokenEnc = input.accessToken ? encryptToken(input.accessToken) : null;
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

  disconnect: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(disqusAccounts)
        .set({
          deletedAt: new Date(),
          isActive: false,
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

  getDecryptedCredentials: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

  testConnection: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

        await client.getForumDetails(account.forumId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Connection test failed",
        };
      }
    }),

  replyToPost: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        threadId: z.string(),
        message: z.string(),
        authorEmail: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
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
