import { db } from "@ticket-app/db";
import {
  organizations,
  organizationSettings,
  users,
  twoFactorAuth,
  subscriptions,
} from "@ticket-app/db/schema";
import { eq, and, sql } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";

export const adminRouter = {
  getOrganizationSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, BigInt(context.auth.userId || 0)),
          eq(users.organizationId, input.organizationId),
        ),
      });

      if (!user?.isPlatformAdmin && user?.id !== context.auth.userId) {
        throw new Error("Unauthorized");
      }

      const settings = await db.query.organizationSettings.findMany({
        where: eq(organizationSettings.organizationId, input.organizationId),
      });

      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value || "";
      }

      return settingsMap;
    }),

  updateOrganizationSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        settings: z.record(z.string(), z.unknown()),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, BigInt(context.auth.userId || 0)),
          eq(users.organizationId, input.organizationId),
        ),
      });

      if (!user?.isPlatformAdmin) {
        throw new Error("Unauthorized");
      }

      for (const [key, value] of Object.entries(input.settings)) {
        const existing = await db.query.organizationSettings.findFirst({
          where: and(
            eq(organizationSettings.organizationId, input.organizationId),
            eq(organizationSettings.key, key),
          ),
        });

        if (existing) {
          await db
            .update(organizationSettings)
            .set({ value, updatedAt: new Date() })
            .where(eq(organizationSettings.id, existing.id));
        } else {
          await db.insert(organizationSettings).values({
            organizationId: input.organizationId,
            key,
            value,
            createdBy: BigInt(context.auth.userId || 0),
            updatedBy: BigInt(context.auth.userId || 0),
          });
        }
      }

      return { success: true };
    }),

  enforce2FA: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        enabled: z.coerce.boolean(),
      }),
    )
    .handler(async ({ input, context }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, BigInt(context.auth.userId || 0)),
          eq(users.organizationId, input.organizationId),
        ),
      });

      if (!user?.isPlatformAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }

      const settingKey = "enforce_2fa";
      const existing = await db.query.organizationSettings.findFirst({
        where: and(
          eq(organizationSettings.organizationId, input.organizationId),
          eq(organizationSettings.key, settingKey),
        ),
      });

      if (existing) {
        await db
          .update(organizationSettings)
          .set({ value: String(input.enabled), updatedAt: new Date() })
          .where(eq(organizationSettings.id, existing.id));
      } else {
        await db.insert(organizationSettings).values({
          organizationId: input.organizationId,
          key: settingKey,
          value: String(input.enabled),
          createdBy: BigInt(context.auth.userId || 0),
          updatedBy: BigInt(context.auth.userId || 0),
        });
      }

      return { success: true, enforce2FA: input.enabled };
    }),

  check2FAEnforced: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const setting = await db.query.organizationSettings.findFirst({
        where: and(
          eq(organizationSettings.organizationId, input.organizationId),
          eq(organizationSettings.key, "enforce_2fa"),
        ),
      });

      return { enforced: setting?.value === "true" };
    }),

  get2FAStatus: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const tfa = await db.query.twoFactorAuth.findFirst({
        where: eq(twoFactorAuth.userId, BigInt(input.userId)),
      });

      return {
        enabled: tfa?.isEnabled || false,
        method: tfa?.method || null,
        enabledAt: tfa?.enabledAt || null,
      };
    }),

  getOrganizationUsage: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
        with: {
          subscription: {
            with: {
              plan: true,
              seats: true,
            },
          },
        },
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(eq(users.organizationId, input.organizationId), sql`${users.deletedAt} IS NULL`),
        );

      const activeSeats = org.subscription?.seats?.filter((s) => !s.removedAt) || [];

      return {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.subscription?.plan?.name || "Free",
          status: org.subscription?.status || "inactive",
        },
        usage: {
          agents: Number(userCount[0]?.count || 0),
          activeSeats: activeSeats.length,
          maxAgents: org.subscription?.plan?.maxAgents || 0,
        },
      };
    }),

  listOrganizations: protectedProcedure
    .input(
      z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(50),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const orgs = await db.query.organizations.findMany({
        limit: input.limit,
        offset,
        where: input.search
          ? sql`${organizations.name} ILIKE ${"%" + input.search + "%"}`
          : undefined,
        with: {
          subscription: {
            with: {
              plan: true,
            },
          },
        },
        orderBy: (organizations, { desc }) => [desc(organizations.createdAt)],
      });

      const total = await db.select({ count: sql<number>`count(*)` }).from(organizations);

      return {
        organizations: orgs.map((org) => ({
          id: org.id,
          uuid: org.uuid,
          name: org.name,
          slug: org.slug,
          plan: org.subscription?.plan?.name || "Free",
          status: org.subscription?.status || "inactive",
          isActive: org.isActive,
          createdAt: org.createdAt,
        })),
        total: Number(total[0]?.count || 0),
        page: input.page,
        limit: input.limit,
      };
    }),

  getPlatformStats: protectedProcedure.handler(async () => {
    const totalOrgs = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(sql`${organizations.deletedAt} IS NULL`);

    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`);

    const totalSubscriptions = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const revenueData = await db.query.revenueSnapshots.findMany({
      orderBy: (revenueSnapshots, { desc }) => [desc(revenueSnapshots.snapshotDate)],
      limit: 30,
    });

    const latestRevenue = revenueData[0];
    const previousRevenue = revenueData[1];

    const mrrChange =
      latestRevenue && previousRevenue
        ? Number(latestRevenue.mrr) - Number(previousRevenue.mrr)
        : 0;

    return {
      totalOrganizations: Number(totalOrgs[0]?.count || 0),
      totalUsers: Number(totalUsers[0]?.count || 0),
      totalActiveSubscriptions: Number(totalSubscriptions[0]?.count || 0),
      currentMRR: latestRevenue ? Number(latestRevenue.mrr) : 0,
      mrrChange,
    };
  }),
};
