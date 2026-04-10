# Data Model: Unified Customer Support & Ticket Management Platform

**Date**: 2026-04-08 | **Source**: ERD-FINAL.md v2.0.0
**ORM**: Drizzle ORM 0.45.x | **Database**: PostgreSQL 16+

---

## Schema Conventions

| Convention                  | Value                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| Primary Key (internal)      | `BIGSERIAL`                                                              |
| Primary Key (public-facing) | `UUID` via `gen_random_uuid()`                                           |
| Timestamps                  | `TIMESTAMPTZ`, always UTC                                                |
| Soft Delete                 | `deleted_at TIMESTAMPTZ NULL`                                            |
| Audit Columns               | `created_by`, `updated_by`, `deleted_by` → `BIGINT REFERENCES users(id)` |
| Enum Replacement            | Centralized `lookup_types` + `lookups` system                            |
| Monetary Amounts            | `BIGINT` in smallest currency unit                                       |
| Naming                      | `snake_case`                                                             |

---

## Drizzle Schema Implementation

### 1. Lookup System

```typescript
// packages/db/src/schema/_lookups.ts

import {
  pgTable,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const lookupTypes = pgTable("lookup_types", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 150 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lookups = pgTable("lookups", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  lookupTypeId: bigint("lookup_type_id", { mode: "number" })
    .references(() => lookupTypes.id)
    .notNull(),
  parentId: bigint("parent_id", { mode: "number" }).references(() => lookups.id),
  organizationId: bigint("organization_id", { mode: "number" }).references(() => organizations.id),
  name: varchar("name", { length: 100 }).notNull(),
  label: varchar("label", { length: 150 }).notNull(),
  labelAr: varchar("label_ar", { length: 150 }),
  color: varchar("color", { length: 7 }),
  icon: varchar("icon", { length: 100 }),
  orderBy: integer("order_by").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

// Seed lookup_types: ticket_status, ticket_priority, task_status, task_priority,
// article_status, channel_type, social_platform, ecommerce_platform, widget_position,
// form_field_type, workflow_trigger, workflow_action_type, sla_breach_action, contact_type, agent_role
```

---

### 2. Organizations & Branding

```typescript
// packages/db/src/schema/_organizations.ts

export const organizations = pgTable("organizations", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").default(false).notNull(),
  planId: bigint("plan_id", { mode: "number" }).references(() => subscriptionPlans.id),
  maxAgents: integer("max_agents"),
  locale: varchar("locale", { length: 10 }).default("en").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
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
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
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
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

export const themes = pgTable("themes", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id)
    .notNull()
    .unique(),
  mode: varchar("mode", { length: 20 }).default("light").notNull(), // light/dark/system
  density: varchar("density", { length: 20 }).default("comfortable").notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 3. Users, Roles & Security

```typescript
// packages/db/src/schema/_users.ts

export const users = pgTable(
  "users",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: varchar("password_hash", { length: 255 }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 30 }),
    bio: text("bio"),
    signatureHtml: text("signature_html"),
    locale: varchar("locale", { length: 10 }).default("en").notNull(),
    timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isPlatformAdmin: boolean("is_platform_admin").default(false).notNull(),
    availabilityStatus: varchar("availability_status", { length: 30 }).default("online").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgEmailUnique: unique().on(table.organizationId, table.email),
  }),
);

export const roles = pgTable(
  "roles",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgSlugUnique: unique().on(table.organizationId, table.slug),
  }),
);

export const permissions = pgTable("permissions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  key: varchar("key", { length: 150 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  group: varchar("group", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    roleId: bigint("role_id", { mode: "number" })
      .references(() => roles.id)
      .notNull(),
    permissionId: bigint("permission_id", { mode: "number" })
      .references(() => permissions.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    rolePermissionUnique: unique().on(table.roleId, table.permissionId),
  }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    roleId: bigint("role_id", { mode: "number" })
      .references(() => roles.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    userRoleUnique: unique().on(table.userId, table.roleId),
  }),
);

export const teams = pgTable("teams", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  autoAssignMethod: varchar("auto_assign_method", { length: 30 }).default("round_robin").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    teamId: bigint("team_id", { mode: "number" })
      .references(() => teams.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    isLead: boolean("is_lead").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    teamMemberUnique: unique().on(table.teamId, table.userId),
  }),
);

export const userSessions = pgTable("user_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id)
    .notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // INET as varchar for portability
  userAgent: text("user_agent"),
  deviceType: varchar("device_type", { length: 50 }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const twoFactorAuth = pgTable("two_factor_auth", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id)
    .notNull()
    .unique(),
  method: varchar("method", { length: 20 }).notNull(), // totp / email_otp
  totpSecret: varchar("totp_secret", { length: 255 }),
  backupCodes: jsonb("backup_codes"),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id),
  name: varchar("name", { length: 150 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
  scopes: jsonb("scopes").default("[]").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

export const ipWhitelist = pgTable("ip_whitelist", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  ipRange: varchar("ip_range", { length: 43 }).notNull(), // CIDR
  label: varchar("label", { length: 150 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
});
```

---

### 4. Contacts

```typescript
// packages/db/src/schema/_contacts.ts

export const contacts = pgTable(
  "contacts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    company: varchar("company", { length: 200 }),
    avatarUrl: text("avatar_url"),
    contactTypeId: bigint("contact_type_id", { mode: "number" }).references(() => lookups.id),
    language: varchar("language", { length: 10 }),
    timezone: varchar("timezone", { length: 50 }),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgEmailUnique: unique().on(table.organizationId, table.email),
  }),
);

export const contactNotes = pgTable("contact_notes", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  contactId: bigint("contact_id", { mode: "number" })
    .references(() => contacts.id)
    .notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" })
    .references(() => users.id)
    .notNull(),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});
```

---

### 5. Mailboxes & Email

```typescript
// packages/db/src/schema/_mailboxes.ts

export const mailboxes = pgTable("mailboxes", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  replyTo: varchar("reply_to", { length: 255 }),
  connectionType: varchar("connection_type", { length: 30 }).notNull(), // imap_smtp / gmail_oauth / outlook_oauth / hosted
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  autoReplyEnabled: boolean("auto_reply_enabled").default(false).notNull(),
  autoReplySubject: varchar("auto_reply_subject", { length: 255 }),
  autoReplyBodyHtml: text("auto_reply_body_html"),
  defaultTeamId: bigint("default_team_id", { mode: "number" }).references(() => teams.id),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const mailboxImapConfigs = pgTable("mailbox_imap_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull()
    .unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEnc: text("password_enc").notNull(),
  useSsl: boolean("use_ssl").default(true).notNull(),
  oauthTokenEnc: text("oauth_token_enc"),
  oauthRefreshTokenEnc: text("oauth_refresh_token_enc"),
  oauthExpiresAt: timestamp("oauth_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxSmtpConfigs = pgTable("mailbox_smtp_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull()
    .unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEnc: text("password_enc").notNull(),
  useTls: boolean("use_tls").default(true).notNull(),
  fromName: varchar("from_name", { length: 150 }),
  fromEmail: varchar("from_email", { length: 255 }),
  dkimPrivateKeyEnc: text("dkim_private_key_enc"),
  dkimSelector: varchar("dkim_selector", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxAliases = pgTable("mailbox_aliases", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull(),
  aliasEmail: varchar("alias_email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
});

export const emailRoutingRules = pgTable("email_routing_rules", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  mailboxId: bigint("mailbox_id", { mode: "number" }).references(() => mailboxes.id),
  name: varchar("name", { length: 150 }).notNull(),
  conditions: jsonb("conditions").notNull(),
  actionTeamId: bigint("action_team_id", { mode: "number" }).references(() => teams.id),
  actionTagIds: bigint("action_tag_ids", { mode: "number" }).array(),
  actionPriorityId: bigint("action_priority_id", { mode: "number" }).references(() => lookups.id),
  orderBy: integer("order_by").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const emailMessages = pgTable("email_messages", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull(),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
  direction: varchar("direction", { length: 10 }).notNull(), // inbound / outbound
  messageId: text("message_id").notNull().unique(),
  inReplyTo: text("in_reply_to"),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }),
  toEmails: jsonb("to_emails").notNull(),
  ccEmails: jsonb("cc_emails"),
  bccEmails: jsonb("bcc_emails"),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  rawHeaders: jsonb("raw_headers"),
  isSpam: boolean("is_spam").default(false).notNull(),
  spamScore: numeric("spam_score", { precision: 5, scale: 2 }),
  bounceType: varchar("bounce_type", { length: 20 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailAttachments = pgTable("email_attachments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  emailMessageId: bigint("email_message_id", { mode: "number" })
    .references(() => emailMessages.id)
    .notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 6. Tickets

```typescript
// packages/db/src/schema/_tickets.ts

export const tickets = pgTable(
  "tickets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    referenceNumber: varchar("reference_number", { length: 30 }).notNull().unique(),
    subject: text("subject").notNull(),
    descriptionHtml: text("description_html"),
    statusId: bigint("status_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    priorityId: bigint("priority_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    channelId: bigint("channel_id", { mode: "number" }).references(() => lookups.id),
    contactId: bigint("contact_id", { mode: "number" }).references(() => contacts.id),
    assignedAgentId: bigint("assigned_agent_id", { mode: "number" }).references(() => users.id),
    assignedTeamId: bigint("assigned_team_id", { mode: "number" }).references(() => teams.id),
    mailboxId: bigint("mailbox_id", { mode: "number" }).references(() => mailboxes.id),
    formSubmissionId: bigint("form_submission_id", { mode: "number" }).references(
      () => formSubmissions.id,
    ),
    socialMessageId: bigint("social_message_id", { mode: "number" }).references(
      () => socialMessages.id,
    ),
    chatSessionId: bigint("chat_session_id", { mode: "number" }).references(() => chatSessions.id),
    parentTicketId: bigint("parent_ticket_id", { mode: "number" }).references(() => tickets.id),
    isMerged: boolean("is_merged").default(false).notNull(),
    isSpam: boolean("is_spam").default(false).notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    lockedBy: bigint("locked_by", { mode: "number" }).references(() => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgStatusIdx: index().on(table.organizationId, table.statusId),
    assignedAgentIdx: index().on(table.assignedAgentId),
    assignedTeamIdx: index().on(table.assignedTeamId),
    contactIdx: index().on(table.contactId),
    createdAtIdx: index("tickets_created_at_idx").on(table.createdAt),
  }),
);

export const ticketMessages = pgTable("ticket_messages", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  emailMessageId: bigint("email_message_id", { mode: "number" }).references(() => emailMessages.id),
  authorType: varchar("author_type", { length: 20 }).notNull(), // agent / contact / system
  authorUserId: bigint("author_user_id", { mode: "number" }).references(() => users.id),
  authorContactId: bigint("author_contact_id", { mode: "number" }).references(() => contacts.id),
  messageType: varchar("message_type", { length: 20 }).notNull(), // reply / note / activity
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const ticketAttachments = pgTable("ticket_attachments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  ticketMessageId: bigint("ticket_message_id", { mode: "number" }).references(
    () => ticketMessages.id,
  ),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
});

export const tags = pgTable(
  "tags",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgNameUnique: unique().on(table.organizationId, table.name),
  }),
);

export const ticketTags = pgTable(
  "ticket_tags",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    tagId: bigint("tag_id", { mode: "number" })
      .references(() => tags.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    ticketTagUnique: unique().on(table.ticketId, table.tagId),
  }),
);

export const ticketFollowers = pgTable(
  "ticket_followers",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketFollowerUnique: unique().on(table.ticketId, table.userId),
  }),
);

export const ticketCc = pgTable(
  "ticket_cc",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketEmailUnique: unique().on(table.ticketId, table.email),
  }),
);

export const ticketMerges = pgTable("ticket_merges", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  masterTicketId: bigint("master_ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  mergedTicketId: bigint("merged_ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  mergedAt: timestamp("merged_at", { withTimezone: true }).defaultNow().notNull(),
  mergedBy: bigint("merged_by", { mode: "number" })
    .references(() => users.id)
    .notNull(),
});

export const ticketCustomFieldValues = pgTable(
  "ticket_custom_field_values",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    fieldId: bigint("field_id", { mode: "number" })
      .references(() => ticketCustomFields.id)
      .notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number"),
    valueBoolean: boolean("value_boolean"),
    valueDate: timestamp("value_date", { withTimezone: true }),
    valueLookupId: bigint("value_lookup_id", { mode: "number" }).references(() => lookups.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    ticketFieldUnique: unique().on(table.ticketId, table.fieldId),
  }),
);

export const ticketViews = pgTable("ticket_views", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id),
  name: varchar("name", { length: 150 }).notNull(),
  filters: jsonb("filters").notNull(),
  sortBy: varchar("sort_by", { length: 50 }).default("created_at").notNull(),
  sortDir: varchar("sort_dir", { length: 4 }).default("desc").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});
```

---

### 7. SLA & Custom Fields

```typescript
// packages/db/src/schema/_sla.ts

export const slaPolicies = pgTable("sla_policies", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  businessHoursOnly: boolean("business_hours_only").default(true).notNull(),
  businessHoursConfig: jsonb("business_hours_config"),
  holidays: jsonb("holidays"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const slaPolicyTargets = pgTable(
  "sla_policy_targets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" })
      .references(() => slaPolicies.id)
      .notNull(),
    priorityId: bigint("priority_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    firstResponseMinutes: integer("first_response_minutes").notNull(),
    resolutionMinutes: integer("resolution_minutes").notNull(),
    escalateAgentId: bigint("escalate_agent_id", { mode: "number" }).references(() => users.id),
    escalateTeamId: bigint("escalate_team_id", { mode: "number" }).references(() => teams.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    policyPriorityUnique: unique().on(table.slaPolicyId, table.priorityId),
  }),
);

export const ticketSla = pgTable("ticket_sla", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull()
    .unique(),
  slaPolicyId: bigint("sla_policy_id", { mode: "number" })
    .references(() => slaPolicies.id)
    .notNull(),
  firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }).notNull(),
  resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }).notNull(),
  firstResponseBreached: boolean("first_response_breached").default(false).notNull(),
  resolutionBreached: boolean("resolution_breached").default(false).notNull(),
  firstResponseBreachedAt: timestamp("first_response_breached_at", { withTimezone: true }),
  resolutionBreachedAt: timestamp("resolution_breached_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  pausedDurationMinutes: integer("paused_duration_minutes").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketCustomFields = pgTable("ticket_custom_fields", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  label: varchar("label", { length: 150 }).notNull(),
  fieldType: varchar("field_type", { length: 30 }).notNull(), // text / number / date / checkbox / dropdown / multi_select
  options: jsonb("options"),
  isRequired: boolean("is_required").default(false).notNull(),
  isVisibleToContact: boolean("is_visible_to_contact").default(false).notNull(),
  orderBy: integer("order_by").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const csatSurveys = pgTable("csat_surveys", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull()
    .unique(),
  sentTo: varchar("sent_to", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rating: smallint("rating"), // 1-5
  comment: text("comment"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 8-16. Additional Modules (Abbreviated)

The remaining modules follow the same patterns established above:

| Module                    | Tables                                                                                                      | Key Features                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Saved Replies** (§8)    | `saved_reply_folders`, `saved_replies`                                                                      | Folders, merge tags, scope (org/team/personal) |
| **Tasks** (§9)            | `tasks`, `task_assignees`, `task_checklist_items`                                                           | Sub-tasks, due dates, linked to tickets        |
| **Form Builder** (§10)    | `forms`, `form_fields`, `form_submissions`, `form_submission_values`                                        | Conditional logic, CAPTCHA, field mapping      |
| **Workflows** (§11)       | `workflows`, `workflow_execution_logs`                                                                      | JSONB rules, trigger/condition/action          |
| **Social Media** (§12)    | `social_accounts`, `social_messages`                                                                        | OAuth, encrypted tokens, platform-specific     |
| **Channels** (§13)        | `channels`                                                                                                  | Unified channel registry                       |
| **Knowledgebase** (§14)   | `kb_categories`, `kb_articles`, `kb_article_related`, `kb_article_feedback`                                 | Multi-language, WYSIWYG content                |
| **Binaka Chat** (§15)     | `chat_widgets`, `chat_sessions`, `chat_messages`                                                            | WebSocket, pre-chat form, ratings              |
| **eCommerce** (§16)       | `ecommerce_stores`, `ecommerce_orders`                                                                      | Shopify/WooCommerce/Salla/Zid                  |
| **Billing** (§20-25)      | `subscription_plans`, `plan_features`, `plan_limits`, `addons`, `subscriptions`, `seats`, `usage_snapshots` | Plans, seats, add-ons, usage tracking          |
| **Invoices** (§25)        | `invoices`, `invoice_items`, `payments`                                                                     | Auto-numbering, VAT, Arabic PDF                |
| **Payments** (§26)        | `payment_methods`, `coupons`, `coupon_redemptions`                                                          | Stripe/PayTabs tokens, coupon types            |
| **Gateway Records** (§28) | `stripe_customers`, `stripe_subscriptions`, `stripe_payment_methods`, `paytabs_transactions`                | Gateway sync                                   |
| **Dunning** (§29)         | `dunning_logs`, `subscription_state_changes`                                                                | Retry schedule, grace period                   |
| **Revenue** (§30)         | `revenue_snapshots`, `mrr_history`                                                                          | MRR/ARR tracking                               |
| **Audit** (§18)           | `audit_logs`, `notifications`, `notification_channels`                                                      | Full activity trail                            |

---

## Indexes Summary

| Table                     | Indexes                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `users`                   | `(organization_id, email)` WHERE deleted_at IS NULL                                                            |
| `tickets`                 | `(organization_id, status_id)`, `(assigned_agent_id)`, `(assigned_team_id)`, `(contact_id)`, `created_at DESC` |
| `lookups`                 | `(lookup_type_id, organization_id)`, `(parent_id)`, `(is_active)`                                              |
| `workflow_execution_logs` | `(workflow_id, executed_at DESC)`, `(ticket_id)`                                                               |
| `social_messages`         | `(social_account_id, platform_message_id)` UNIQUE                                                              |

---

## Relationships Summary

```
organizations
  ├── users (1:N)
  ├── roles (1:N)
  ├── teams (1:N)
  ├── contacts (1:N)
  ├── mailboxes (1:N)
  ├── tickets (1:N)
  ├── forms (1:N)
  ├── workflows (1:N)
  ├── knowledgebase (1:N)
  ├── subscription (1:1)
  └── branding_config (1:1)

tickets
  ├── ticket_messages (1:N)
  ├── ticket_attachments (1:N)
  ├── ticket_tags (N:N via ticket_tags)
  ├── ticket_custom_field_values (1:N)
  ├── ticket_sla (1:1)
  └── ticket_views (1:N)

users
  ├── user_roles (N:N via user_roles)
  ├── team_members (N:N via team_members)
  └── sessions (1:N)
```

---

## Migration Strategy

1. **Initial migration**: Create all tables with relationships
2. **Seed migrations**: Insert lookup_types and default lookups
3. **Subsequent migrations**: Per-feature migrations as modules are implemented

```bash
# Generate migration from schema changes
bun db:generate

# Apply migrations
bun db:migrate

# Push schema (dev only, no migration files)
bun db:push
```
