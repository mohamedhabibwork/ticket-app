import {
  pgTable,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./_users";
import { roles, teams } from "./_users";
import { subscriptionPlans, subscriptions } from "./_billing";
import { lookups } from "./_lookups";
import { contacts } from "./_contacts";
import { mailboxes } from "./_mailboxes";
import { tickets } from "./_tickets";
import { forms } from "./_forms";
import { workflows } from "./_workflows";
import { kbCategories } from "./_knowledgebase";

export const organizations = pgTable("organizations", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").default(false).notNull(),
  planId: bigint("plan_id", { mode: "number" }).references((): any => subscriptionPlans.id),
  maxAgents: integer("max_agents"),
  locale: varchar("locale", { length: 10 }).default("en").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
});

export const organizationSettings = pgTable(
  "organization_settings",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    key: varchar("key", { length: 150 }).notNull(),
    value: text("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgKeyUnique: unique().on(table.organizationId, table.key),
  }),
);

export const brandingConfigs = pgTable("branding_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull()
    .unique(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: varchar("primary_color", { length: 7 }),
  secondaryColor: varchar("secondary_color", { length: 7 }),
  backgroundColor: varchar("background_color", { length: 7 }),
  fontFamily: varchar("font_family", { length: 100 }),
  customCss: text("custom_css"),
  loginBgUrl: text("login_bg_url"),
  loginHeadline: varchar("login_headline", { length: 255 }),
  hideVendorBranding: boolean("hide_vendor_branding").default(false).notNull(),
  portalHeaderHtml: text("portal_header_html"),
  portalFooterHtml: text("portal_footer_html"),
  emailLogoUrl: text("email_logo_url"),
  emailHeaderColor: varchar("email_header_color", { length: 7 }),
  emailFooterText: text("email_footer_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
});

export const themes = pgTable("themes", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  userId: bigint("user_id", { mode: "number" })
    .references((): any => users.id)
    .notNull()
    .unique(),
  mode: varchar("mode", { length: 20 }).default("light").notNull(),
  density: varchar("density", { length: 20 }).default("comfortable").notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  lookups: many(lookups),
  users: many(users),
  roles: many(roles),
  teams: many(teams),
  contacts: many(contacts),
  mailboxes: many(mailboxes),
  tickets: many(tickets),
  forms: many(forms),
  workflows: many(workflows),
  kbCategories: many(kbCategories),
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.organizationId],
  }),
  brandingConfig: one(brandingConfigs, {
    fields: [organizations.id],
    references: [brandingConfigs.organizationId],
  }),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const brandingConfigsRelations = relations(brandingConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [brandingConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const themesRelations = relations(themes, ({ one }) => ({
  user: one(users, {
    fields: [themes.userId],
    references: [users.id],
  }),
}));
