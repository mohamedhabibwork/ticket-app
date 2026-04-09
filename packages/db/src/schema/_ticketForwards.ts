import { pgTable, bigint, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ticketMessages, tickets } from "./_tickets";
import { users } from "./_users";

export const ticketForwards = pgTable("ticket_forwards", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  ticketMessageId: bigint("ticket_message_id", { mode: "number" }).references(
    () => ticketMessages.id,
  ),
  forwardedTo: jsonb("forwarded_to").notNull(),
  ccEmails: jsonb("cc_emails"),
  bccEmails: jsonb("bcc_emails"),
  subject: text("subject"),
  bodyHtml: text("body_html"),
  forwardedAt: timestamp("forwarded_at", { withTimezone: true }).defaultNow().notNull(),
  forwardedBy: bigint("forwarded_by", { mode: "number" })
    .references(() => users.id)
    .notNull(),
});

export const ticketForwardsRelations = relations(ticketForwards, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketForwards.ticketId],
    references: [tickets.id],
  }),
  message: one(ticketMessages, {
    fields: [ticketForwards.ticketMessageId],
    references: [ticketMessages.id],
  }),
  forwarder: one(users, {
    fields: [ticketForwards.forwardedBy],
    references: [users.id],
  }),
}));
