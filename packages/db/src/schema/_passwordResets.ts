import { pgTable, bigint, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./_users";

export const passwordResets = pgTable(
  "password_resets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    requestedBy: bigint("requested_by", { mode: "number" }).references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("password_resets_user_idx").on(table.userId),
    tokenUnique: unique().on(table.token),
  }),
);

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
  requester: one(users, {
    fields: [passwordResets.requestedBy],
    references: [users.id],
    relationName: "requestedBy",
  }),
}));
