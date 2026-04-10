import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./_contacts";

export const customerSocialIdentities = pgTable(
  "customer_social_identities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    contactId: bigint("contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    providerEmail: varchar("provider_email", { length: 255 }),
    providerUsername: varchar("provider_username", { length: 150 }),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contactProviderUnique: index("customer_social_contact_provider_idx").on(
      table.contactId,
      table.provider,
    ),
  }),
);

export const customerSessions = pgTable(
  "customer_sessions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    contactId: bigint("contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    customerSocialIdentityId: bigint("customer_social_identity_id", { mode: "number" }).references(
      (): any => customerSocialIdentities.id,
    ),
    sessionToken: varchar("session_token", { length: 500 }).notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 50 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contactIdx: index("customer_sessions_contact_idx").on(table.contactId),
  }),
);

export const customerSocialIdentitiesRelations = relations(customerSocialIdentities, ({ one }) => ({
  contact: one(contacts, {
    fields: [customerSocialIdentities.contactId],
    references: [contacts.id],
  }),
}));

export const customerSessionsRelations = relations(customerSessions, ({ one }) => ({
  contact: one(contacts, {
    fields: [customerSessions.contactId],
    references: [contacts.id],
  }),
}));
