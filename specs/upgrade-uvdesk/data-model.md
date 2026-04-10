# UVDesk Upgrade - Data Model

**Date**: 2026-04-09 | **Source**: `UPGRADE-UVDESK.md`

## New Schema Files

All new schema additions go into `packages/db/src/schema/` following existing naming conventions.

---

## 1. Groups (Department Level)

**File**: `_groups.ts` (new)

```typescript
import {
  pgTable,
  bigint,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { organizations, teams, users } from "./index";

export const groups = pgTable("groups", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  defaultTeamId: bigint("default_team_id", { mode: "number" }).references(() => teams.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});
```

---

## 2. Ticket Categories

**File**: `_tickets.ts` (addition - new file for category-specific schema)

```typescript
import { pgTable, bigint, uuid, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { organizations, lookups, teams, slaPolicies, users } from './index';

export const ticketCategories = pgTable('ticket_categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid('uuid').notNull().defaultRandom(),
  organizationId: bigint('organization_id', { mode: 'number' }).notNull().references(() => organizations.id),
  name: varchar('name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 7 }), // hex color
  defaultPriorityId: bigint('default_priority_id', { mode: 'number' }).references(() => lookups.id),
  defaultTeamId: bigint('default_team_id', { mode: 'number' }).references(() => teams.id),
  defaultSlaPolicyId: bigint('default_sla_policy_id', { mode: 'number' }).references(() => slaPolicies.id),
  isActive: boolean('is_active').notNull().default(true),
  orderBy: integer('order_by').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { with withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id),
  updatedBy: bigint('updated_by', { mode: 'number' }).references(() => users.id),
  deletedBy: bigint('deleted_by', { mode: 'number' }).references(() => users.id),
});
```

---

## 3. Ticket Forwards

**File**: `_tickets.ts` (addition)

```typescript
export const ticketForwards = pgTable("ticket_forwards", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .notNull()
    .references(() => tickets.id),
  ticketMessageId: bigint("ticket_message_id", { mode: "number" }).references(
    () => ticketMessages.id,
  ),
  forwardedTo: jsonb("forwarded_to").notNull(), // string[] of email addresses
  ccEmails: jsonb("cc_emails"),
  bccEmails: jsonb("bcc_emails"),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  forwardedAt: timestamp("forwarded_at", { withTimezone: true }).notNull().defaultNow(),
  forwardedBy: bigint("forwarded_by", { mode: "number" })
    .notNull()
    .references(() => users.id),
});
```

---

## 4. Thread-Level Locking Columns (ticket_messages)

**File**: `_tickets.ts` (alter existing)

Added to `ticketMessages` table:

```typescript
isThreadLocked: boolean('is_thread_locked').notNull().default(false),
threadLockedBy: bigint('thread_locked_by', { mode: 'number' }).references(() => users.id),
threadLockedAt: timestamp('thread_locked_at', { withTimezone: true }),
threadUnlockedBy: bigint('thread_unlocked_by', { mode: 'number' }).references(() => users.id),
threadUnlockedAt: timestamp('thread_unlocked_at', { withTimezone: true }),
deletedReason: text('deleted_reason'), // for thread omission audit
```

---

## 5. Image Gallery Columns (ticket_attachments)

**File**: `_tickets.ts` (alter existing)

Added to `ticketAttachments` table:

```typescript
isInlineImage: boolean('is_inline_image').notNull().default(false),
imageWidth: integer('image_width'),
imageHeight: integer('image_height'),
thumbnailKey: text('thumbnail_key'), // S3 key for 200px thumbnail
galleryOrder: integer('gallery_order'), // position in thread gallery
```

---

## 6. Group FK on Teams

**File**: `_teams.ts` (alter existing)

Added to `teams` table:

```typescript
groupId: bigint('group_id', { mode: 'number' }).references(() => groups.id),
```

---

## 7. Ticket View Scope on Roles

**File**: `_users.ts` (alter existing)

Added to `roles` table:

```typescript
ticketViewScope: varchar('ticket_view_scope', { length: 20 }).notNull().default('all'),
// Values: 'all' | 'group' | 'self'
```

---

## 8. Category FK on Tickets

**File**: `_tickets.ts` (alter existing)

Added to `tickets` table:

```typescript
categoryId: bigint('category_id', { mode: 'number' }).references(() => ticketCategories.id),
assignedGroupId: bigint('assigned_group_id', { mode: 'number' }).references(() => groups.id),
```

---

## 9. Disqus Accounts

**File**: `_social.ts` (addition)

```typescript
export const disqusAccounts = pgTable("disqus_accounts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  forumShortname: varchar("forum_shortname", { length: 150 }).notNull(),
  apiKeyEnc: text("api_key_enc").notNull(),
  apiSecretEnc: text("api_secret_enc").notNull(),
  accessTokenEnc: text("access_token_enc"),
  defaultTeamId: bigint("default_team_id", { mode: "number" }).references(() => teams.id),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});
```

---

## 10. Marketplace Accounts & Messages

**File**: `_ecommerce.ts` (addition)

```typescript
export const marketplaceAccounts = pgTable("marketplace_accounts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  platform: varchar("platform", { length: 50 }).notNull(), // 'amazon', 'ebay'
  accountName: varchar("account_name", { length: 255 }).notNull(),
  sellerId: varchar("seller_id", { length: 255 }),
  marketplaceId: varchar("marketplace_id", { length: 50 }),
  spApiClientIdEnc: text("sp_api_client_id_enc"),
  spApiClientSecretEnc: text("sp_api_client_secret_enc"),
  spApiRefreshTokenEnc: text("sp_api_refresh_token_enc"),
  defaultTeamId: bigint("default_team_id", { mode: "number" }).references(() => teams.id),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
});

export const marketplaceMessages = pgTable("marketplace_messages", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  marketplaceAccountId: bigint("marketplace_account_id", { mode: "number" })
    .notNull()
    .references(() => marketplaceAccounts.id),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
  platformMessageId: varchar("platform_message_id", { length: 500 }).notNull(),
  amazonOrderId: varchar("amazon_order_id", { length: 100 }),
  buyerEmail: varchar("buyer_email", { length: 255 }),
  buyerName: varchar("buyer_name", { length: 255 }),
  subject: text("subject"),
  body: text("body"),
  direction: varchar("direction", { length: 10 }).notNull(), // 'inbound' | 'outbound'
  receivedAt: timestamp("received_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 11. Google Calendar Integration

**File**: `_users.ts` (addition)

```typescript
export const agentCalendarConnections = pgTable("agent_calendar_connections", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => users.id),
  provider: varchar("provider", { length: 30 }).notNull().default("google"),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  calendarId: varchar("calendar_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketCalendarEvents = pgTable("ticket_calendar_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
  taskId: bigint("task_id", { mode: "number" }).references(() => tasks.id),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  provider: varchar("provider", { length: 30 }).notNull().default("google"),
  eventId: varchar("event_id", { length: 500 }).notNull(),
  eventUrl: text("event_url"),
  title: varchar("title", { length: 500 }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 12. GDPR Requests

**File**: `_audit.ts` (addition)

```typescript
export const gdprRequests = pgTable("gdpr_requests", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  contactId: bigint("contact_id", { mode: "number" })
    .notNull()
    .references(() => contacts.id),
  requestType: varchar("request_type", { length: 30 }).notNull(), // 'access' | 'erasure' | 'portability'
  status: varchar("status", { length: 20 }).notNull().default("received"),
  // 'received' | 'in_progress' | 'completed' | 'rejected'
  requesterEmail: varchar("requester_email", { length: 255 }).notNull(),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  exportKey: text("export_key"), // S3 key of generated data export
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});
```

---

## 13. Customer Social Identities & Sessions

**File**: `_contacts.ts` (addition)

```typescript
export const customerSocialIdentities = pgTable("customer_social_identities", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  contactId: bigint("contact_id", { mode: "number" })
    .notNull()
    .references(() => contacts.id),
  provider: varchar("provider", { length: 30 }).notNull(), // 'google' | 'facebook' | 'apple'
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  accessTokenEnc: text("access_token_enc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerSessions = pgTable("customer_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  contactId: bigint("contact_id", { mode: "number" })
    .notNull()
    .references(() => contacts.id),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 14. Translation Config & Cache

**File**: `_organizations.ts` (addition)

```typescript
export const translationConfigs = pgTable("translation_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => organizations.id),
  provider: varchar("provider", { length: 30 }).notNull().default("google"), // 'google' | 'deepl'
  apiKeyEnc: text("api_key_enc"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

export const translationCache = pgTable("translation_cache", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull().unique(), // SHA-256 of source text + target_lang
  sourceLanguage: varchar("source_language", { length: 10 }),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  translatedText: text("translated_text").notNull(),
  provider: varchar("provider", { length: 30 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 15. Mobile SDK Config, Push Tokens & Logs

**File**: `_organizations.ts` (addition)

```typescript
export const mobileSdkConfigs = pgTable("mobile_sdk_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => organizations.id),
  appId: uuid("app_id").notNull().defaultRandom(),
  appSecretHash: varchar("app_secret_hash", { length: 255 }).notNull(),
  androidFcmServerKeyEnc: text("android_fcm_server_key_enc"),
  iosApnsKeyEnc: text("ios_apns_key_enc"),
  iosApnsKeyId: varchar("ios_apns_key_id", { length: 20 }),
  iosTeamId: varchar("ios_team_id", { length: 20 }),
  iosBundleId: varchar("ios_bundle_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

export const contactPushTokens = pgTable("contact_push_tokens", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  contactId: bigint("contact_id", { mode: "number" })
    .notNull()
    .references(() => contacts.id),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  platform: varchar("platform", { length: 10 }).notNull(), // 'ios' | 'android'
  token: text("token").notNull(),
  deviceId: varchar("device_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushNotificationLogs = pgTable("push_notification_logs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  contactId: bigint("contact_id", { mode: "number" }).references(() => contacts.id),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
  platform: varchar("platform", { length: 10 }).notNull(),
  token: text("token").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  status: varchar("status", { length: 20 }).notNull(), // 'sent' | 'failed' | 'bounced'
  providerResponse: jsonb("provider_response"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 16. AI Chatbot Config, Sessions & Messages

**File**: `_chat.ts` (addition)

```typescript
export const chatbotConfigs = pgTable("chatbot_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => organizations.id),
  isEnabled: boolean("is_enabled").notNull().default(false),
  llmProvider: varchar("llm_provider", { length: 30 }).notNull().default("openai"), // 'openai' | 'anthropic' | 'azure_openai'
  apiKeyEnc: text("api_key_enc"),
  model: varchar("model", { length: 100 }).notNull().default("gpt-4o"),
  systemPrompt: text("system_prompt"),
  confidenceThreshold: numeric("confidence_threshold", { precision: 3, scale: 2 })
    .notNull()
    .default(0.7),
  useKnowledgebase: boolean("use_knowledgebase").notNull().default(true),
  escalationMessage: text("escalation_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
});

export const chatbotSessions = pgTable("chatbot_sessions", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  chatSessionId: bigint("chat_session_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => chatSessions.id),
  organizationId: bigint("organization_id", { mode: "number" })
    .notNull()
    .references(() => organizations.id),
  wasEscalated: boolean("was_escalated").notNull().default(false),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  deflected: boolean("deflected").notNull().default(false),
  messagesCount: integer("messages_count").notNull().default(0),
  avgConfidence: numeric("avg_confidence", { precision: 4, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatbotMessages = pgTable("chatbot_messages", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  chatbotSessionId: bigint("chatbot_session_id", { mode: "number" })
    .notNull()
    .references(() => chatbotSessions.id),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 }),
  kbArticleIds: bigint("kb_article_ids", { mode: "number" }).array(),
  tokenCount: integer("token_count"),
  agentRating: smallint("agent_rating"), // 1-5 rating by reviewing agent
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 17. On-Premise Licenses

**File**: `_organizations.ts` (addition)

```typescript
export const onPremiseLicenses = pgTable("on_premise_licenses", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").notNull().defaultRandom(),
  licenseKey: varchar("license_key", { length: 255 }).notNull().unique(),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  maxAgents: integer("max_agents").notNull(),
  features: jsonb("features").notNull(), // Enabled features JSON
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

---

## Schema Index

All new tables must be exported from `packages/db/src/schema/index.ts`.

## Migration Strategy

Use Drizzle Kit for migration generation:

```bash
bun db:generate
bun db:migrate
```

All new tables use `bigint` with `mode: 'number'` for JavaScript compatibility.
All encrypted fields postfix with `_enc`.
All soft-delete columns: `deleted_at`, `deleted_by`.
All timestamps use `withTimezone: true`.
