import { pgTable, bigint, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tickets } from "./_tickets";
import { users } from "./_users";

export const presence = pgTable("presence", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id)
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const presenceRelations = relations(presence, ({ one }) => ({
  ticket: one(tickets, {
    fields: [presence.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [presence.userId],
    references: [users.id],
  }),
}));
