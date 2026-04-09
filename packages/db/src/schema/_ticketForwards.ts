import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ticketMessages, tickets } from "./_tickets";
import { users } from "./_users";

export const ticketForwards = pgTable(
  "ticket_forwards",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    ticketMessageId: bigint("ticket_message_id", { mode: "number" }).references(() => ticketMessages.id),
    to: jsonb("to").notNull(),
    cc: jsonb("cc").default([]).notNull(),
    bcc: jsonb("bcc").default([]).notNull(),
    subject: varchar("subject", { length: 500 }),
    body: text("body").notNull(),
    createdBy: bigint("created_by", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const ticketForwardsRelations = relations(ticketForwards, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketForwards.ticketId],
    references: [tickets.id],
  }),
  message: one(ticketMessages, {
    fields: [ticketForwards.ticketMessageId],
    references: [ticketMessages.id],
  }),
  creator: one(users, {
    fields: [ticketForwards.createdBy],
    references: [users.id],
  }),
}));
