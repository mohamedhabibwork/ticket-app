import {
  pgTable,
  bigint,
  boolean,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./_users";
import { tickets } from "./_tickets";

export const agentCalendarConnections = pgTable(
  "agent_calendar_connections",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull().default("google"),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    calendarId: varchar("calendar_id", { length: 255 }),
    calendarName: varchar("calendar_name", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("agent_calendar_connections_user_idx").on(table.userId),
  }),
);

export const ticketCalendarEvents = pgTable(
  "ticket_calendar_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    agentCalendarConnectionId: bigint("agent_calendar_connection_id", { mode: "number" })
      .references(() => agentCalendarConnections.id)
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    attendees: text("attendees"),
    isReminderSent: boolean("is_reminder_sent").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    ticketIdx: index("ticket_calendar_events_ticket_idx").on(table.ticketId),
    providerEventIdx: index("ticket_calendar_events_provider_idx").on(
      table.agentCalendarConnectionId,
      table.providerEventId,
    ),
  }),
);

export const agentCalendarConnectionsRelations = relations(
  agentCalendarConnections,
  ({ one, many }) => ({
    user: one(users, {
      fields: [agentCalendarConnections.userId],
      references: [users.id],
    }),
    ticketEvents: many(ticketCalendarEvents),
  }),
);

export const ticketCalendarEventsRelations = relations(ticketCalendarEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketCalendarEvents.ticketId],
    references: [tickets.id],
  }),
  calendarConnection: one(agentCalendarConnections, {
    fields: [ticketCalendarEvents.agentCalendarConnectionId],
    references: [agentCalendarConnections.id],
  }),
}));
