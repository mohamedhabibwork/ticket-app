import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { db } from "@ticket-app/db";
import {
  organizations,
  organizationSettings,
  brandingConfigs,
  themes,
} from "@ticket-app/db/schema";
import { publicProcedure } from "../index";
import * as z from "zod";

const organizationSelect = {
  id: true,
  uuid: true,
  name: true,
  slug: true,
  subdomain: true,
  customDomain: true,
  customDomainVerified: true,
  planId: true,
  maxAgents: true,
  locale: true,
  timezone: true,
  isActive: true,
  trialEndsAt: true,
  createdAt: true,
  updatedAt: true,
};

export const organizationsRouter = {
  list: publicProcedure
    .input(
      z.object({
        isActive: z.coerce.boolean().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [isNull(organizations.deletedAt)];

      if (input.isActive !== undefined) {
        conditions.push(eq(organizations.isActive, input.isActive));
      }

      if (input.search) {
        conditions.push(
          sql`(${organizations.name} ILIKE ${`%${input.search}%`} OR ${organizations.slug} ILIKE ${`%${input.search}%`})`,
        );
      }

      const orgList = await db.query.organizations.findMany({
        where: and(...conditions),
        columns: organizationSelect,
        orderBy: [desc(organizations.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(organizations)
        .where(and(...conditions));

      return {
        organizations: orgList,
        total: Number(countResult[0]?.count || 0),
      };
    }),

  get: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, input.id), isNull(organizations.deletedAt)),
    });
    return org ?? null;
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).handler(async ({ input }) => {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.slug, input.slug), isNull(organizations.deletedAt)),
    });
    return org ?? null;
  }),

  getBySubdomain: publicProcedure
    .input(z.object({ subdomain: z.string() }))
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: and(
          eq(organizations.subdomain, input.subdomain),
          eq(organizations.isActive, true),
          isNull(organizations.deletedAt),
        ),
      });
      return org ?? null;
    }),

  getByCustomDomain: publicProcedure
    .input(z.object({ domain: z.string() }))
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: and(
          eq(organizations.customDomain, input.domain),
          eq(organizations.customDomainVerified, true),
          eq(organizations.isActive, true),
          isNull(organizations.deletedAt),
        ),
      });
      return org ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
        subdomain: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase alphanumeric with dashes"),
        customDomain: z.string().max(255).optional(),
        locale: z.string().max(10).default("en"),
        timezone: z.string().max(50).default("UTC"),
        planId: z.coerce.number().optional(),
        maxAgents: z.coerce.number().optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existingSlug = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existingSlug) {
        throw new Error("Organization with this slug already exists");
      }

      const existingSubdomain = await db.query.organizations.findFirst({
        where: eq(organizations.subdomain, input.subdomain),
      });

      if (existingSubdomain) {
        throw new Error("Organization with this subdomain already exists");
      }

      if (input.customDomain) {
        const existingDomain = await db.query.organizations.findFirst({
          where: eq(organizations.customDomain, input.customDomain),
        });

        if (existingDomain) {
          throw new Error("Organization with this custom domain already exists");
        }
      }

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const [org] = await db
        .insert(organizations)
        .values({
          name: input.name,
          slug: input.slug,
          subdomain: input.subdomain,
          customDomain: input.customDomain,
          locale: input.locale,
          timezone: input.timezone,
          planId: input.planId,
          maxAgents: input.maxAgents,
          trialEndsAt,
          createdBy: input.createdBy,
        })
        .returning();

      await db.insert(brandingConfigs).values({
        organizationId: org.id,
      });

      return org;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        name: z.string().min(1).max(255).optional(),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        subdomain: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        customDomain: z.string().max(255).optional().nullable,
        locale: z.string().max(10).optional(),
        timezone: z.string().max(50).optional(),
        isActive: z.coerce.boolean().optional(),
        maxAgents: z.coerce.number().optional().nullable,
      }),
    )
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: and(eq(organizations.id, input.id), isNull(organizations.deletedAt)),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      if (input.slug && input.slug !== org.slug) {
        const existing = await db.query.organizations.findFirst({
          where: eq(organizations.slug, input.slug),
        });
        if (existing) {
          throw new Error("Organization with this slug already exists");
        }
      }

      if (input.subdomain && input.subdomain !== org.subdomain) {
        const existing = await db.query.organizations.findFirst({
          where: eq(organizations.subdomain, input.subdomain),
        });
        if (existing) {
          throw new Error("Organization with this subdomain already exists");
        }
      }

      if (input.customDomain && input.customDomain !== org.customDomain) {
        const existing = await db.query.organizations.findFirst({
          where: eq(organizations.customDomain, input.customDomain),
        });
        if (existing) {
          throw new Error("Organization with this custom domain already exists");
        }
      }

      const [updated] = await db
        .update(organizations)
        .set({
          name: input.name,
          slug: input.slug,
          subdomain: input.subdomain,
          customDomain: input.customDomain,
          locale: input.locale,
          timezone: input.timezone,
          isActive: input.isActive,
          maxAgents: input.maxAgents,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.id))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        deletedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: and(eq(organizations.id, input.id), isNull(organizations.deletedAt)),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      await db
        .update(organizations)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(eq(organizations.id, input.id));

      return { success: true };
    }),

  verifyCustomDomain: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(organizations)
        .set({
          customDomainVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.id))
        .returning();

      return updated;
    }),

  getSettings: publicProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input }) => {
      const settings = await db.query.organizationSettings.findMany({
        where: eq(organizationSettings.organizationId, input.organizationId),
      });

      const result: Record<string, string> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value || "";
      }
      return result;
    }),

  getSetting: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        key: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const setting = await db.query.organizationSettings.findFirst({
        where: and(
          eq(organizationSettings.organizationId, input.organizationId),
          eq(organizationSettings.key, input.key),
        ),
      });
      return setting?.value ?? null;
    }),

  setSetting: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        key: z.string(),
        value: z.string(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.organizationSettings.findFirst({
        where: and(
          eq(organizationSettings.organizationId, input.organizationId),
          eq(organizationSettings.key, input.key),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(organizationSettings)
          .set({
            value: input.value,
            updatedAt: new Date(),
            updatedBy: input.createdBy,
          })
          .where(eq(organizationSettings.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(organizationSettings)
        .values({
          organizationId: input.organizationId,
          key: input.key,
          value: input.value,
          createdBy: input.createdBy,
        })
        .returning();

      return created;
    }),

  deleteSetting: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        key: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(organizationSettings)
        .where(
          and(
            eq(organizationSettings.organizationId, input.organizationId),
            eq(organizationSettings.key, input.key),
          ),
        );

      return { success: true };
    }),

  bulkSetSettings: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        settings: z.record(z.string()),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const results = [];

      for (const [key, value] of Object.entries(input.settings)) {
        const existing = await db.query.organizationSettings.findFirst({
          where: and(
            eq(organizationSettings.organizationId, input.organizationId),
            eq(organizationSettings.key, key),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(organizationSettings)
            .set({
              value,
              updatedAt: new Date(),
              updatedBy: input.createdBy,
            })
            .where(eq(organizationSettings.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [created] = await db
            .insert(organizationSettings)
            .values({
              organizationId: input.organizationId,
              key,
              value,
              createdBy: input.createdBy,
            })
            .returning();
          results.push(created);
        }
      }

      return results;
    }),

  getBranding: publicProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input }) => {
      const branding = await db.query.brandingConfigs.findFirst({
        where: eq(brandingConfigs.organizationId, input.organizationId),
      });
      return branding ?? null;
    }),

  updateBranding: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        logoUrl: z.url().optional().nullable(),
        faviconUrl: z.url().optional().nullable(),
        primaryColor: z.string().max(7).optional(),
        secondaryColor: z.string().max(7).optional(),
        backgroundColor: z.string().max(7).optional(),
        fontFamily: z.string().max(100).optional().nullable(),
        customCss: z.string().optional().nullable(),
        loginBgUrl: z.url().optional().nullable(),
        loginHeadline: z.string().max(255).optional().nullable(),
        hideVendorBranding: z.coerce.boolean().optional(),
        portalHeaderHtml: z.string().optional().nullable(),
        portalFooterHtml: z.string().optional().nullable(),
        emailLogoUrl: z.url().optional().nullable(),
        emailHeaderColor: z.string().max(7).optional(),
        emailFooterText: z.string().optional().nullable(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.brandingConfigs.findFirst({
        where: eq(brandingConfigs.organizationId, input.organizationId),
      });

      if (!existing) {
        const [created] = await db
          .insert(brandingConfigs)
          .values({
            organizationId: input.organizationId,
            logoUrl: input.logoUrl,
            faviconUrl: input.faviconUrl,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            backgroundColor: input.backgroundColor,
            fontFamily: input.fontFamily,
            customCss: input.customCss,
            loginBgUrl: input.loginBgUrl,
            loginHeadline: input.loginHeadline,
            hideVendorBranding: input.hideVendorBranding,
            portalHeaderHtml: input.portalHeaderHtml,
            portalFooterHtml: input.portalFooterHtml,
            emailLogoUrl: input.emailLogoUrl,
            emailHeaderColor: input.emailHeaderColor,
            emailFooterText: input.emailFooterText,
            createdBy: input.updatedBy,
          })
          .returning();
        return created;
      }

      const [updated] = await db
        .update(brandingConfigs)
        .set({
          logoUrl: input.logoUrl,
          faviconUrl: input.faviconUrl,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          backgroundColor: input.backgroundColor,
          fontFamily: input.fontFamily,
          customCss: input.customCss,
          loginBgUrl: input.loginBgUrl,
          loginHeadline: input.loginHeadline,
          hideVendorBranding: input.hideVendorBranding,
          portalHeaderHtml: input.portalHeaderHtml,
          portalFooterHtml: input.portalFooterHtml,
          emailLogoUrl: input.emailLogoUrl,
          emailHeaderColor: input.emailHeaderColor,
          emailFooterText: input.emailFooterText,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(eq(brandingConfigs.id, existing.id))
        .returning();

      return updated;
    }),

  getTheme: publicProcedure
    .input(z.object({ userId: z.coerce.number() }))
    .handler(async ({ input }) => {
      const theme = await db.query.themes.findFirst({
        where: eq(themes.userId, input.userId),
      });
      return theme ?? null;
    }),

  updateTheme: publicProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        mode: z.enum(["light", "dark", "system"]).optional(),
        density: z.enum(["compact", "comfortable", "spacious"]).optional(),
        sidebarCollapsed: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.themes.findFirst({
        where: eq(themes.userId, input.userId),
      });

      if (existing) {
        const [updated] = await db
          .update(themes)
          .set({
            mode: input.mode,
            density: input.density,
            sidebarCollapsed: input.sidebarCollapsed,
            updatedAt: new Date(),
          })
          .where(eq(themes.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(themes)
        .values({
          userId: input.userId,
          mode: input.mode || "light",
          density: input.density || "comfortable",
          sidebarCollapsed: input.sidebarCollapsed || false,
        })
        .returning();

      return created;
    }),

  getFullOrganization: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input }) => {
      const org = await db.query.organizations.findFirst({
        where: and(eq(organizations.id, input.id), isNull(organizations.deletedAt)),
        with: {
          brandingConfig: true,
          subscription: {
            with: {
              plan: true,
            },
          },
        },
      });

      if (!org) {
        return null;
      }

      const settings = await db.query.organizationSettings.findMany({
        where: eq(organizationSettings.organizationId, input.id),
      });

      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value || "";
      }

      return {
        ...org,
        settings: settingsMap,
      };
    }),
};
