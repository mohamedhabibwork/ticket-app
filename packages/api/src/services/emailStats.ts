import { db } from "@ticket-app/db";
import { emailMessages, tickets } from "@ticket-app/db/schema";
import { eq, and, gte, lte, sql, isNotNull, avg } from "drizzle-orm";

export interface EmailStatistics {
  totalEmails: number;
  inboundEmails: number;
  outboundEmails: number;
  ticketsCreated: number;
  ticketsReplied: number;
  avgResponseTimeMs: number;
}

export async function getEmailStatistics(
  mailboxId: number,
  startDate?: string,
  endDate?: string,
): Promise<EmailStatistics> {
  const conditions = [eq(emailMessages.mailboxId, mailboxId)];

  if (startDate) {
    conditions.push(gte(emailMessages.receivedAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(emailMessages.receivedAt, new Date(endDate)));
  }

  const stats = await db
    .select({
      totalEmails: sql<number>`count(*)::int`,
      inboundEmails: sql<number>`count(*)::int filter (where ${emailMessages.direction} = 'inbound')`,
      outboundEmails: sql<number>`count(*)::int filter (where ${emailMessages.direction} = 'outbound')`,
    })
    .from(emailMessages)
    .where(and(...conditions));

  const ticketConditions = [eq(tickets.mailboxId, mailboxId)];
  if (startDate) {
    ticketConditions.push(gte(tickets.createdAt, new Date(startDate)));
  }
  if (endDate) {
    ticketConditions.push(lte(tickets.createdAt, new Date(endDate)));
  }

  const ticketStats = await db
    .select({
      ticketsCreated: sql<number>`count(*)::int`,
      ticketsReplied: sql<number>`count(*)::int filter (where ${tickets.firstResponseAt} is not null)`,
    })
    .from(tickets)
    .where(and(...ticketConditions));

  const responseTimeStats = await db
    .select({
      avgResponseTimeMs: avg(
        sql`EXTRACT(EPOCH FROM (${tickets.firstResponseAt} - ${tickets.createdAt}))::int * 1000`,
      ),
    })
    .from(tickets)
    .where(and(...ticketConditions, isNotNull(tickets.firstResponseAt)));

  return {
    totalEmails: stats[0]?.totalEmails ?? 0,
    inboundEmails: stats[0]?.inboundEmails ?? 0,
    outboundEmails: stats[0]?.outboundEmails ?? 0,
    ticketsCreated: ticketStats[0]?.ticketsCreated ?? 0,
    ticketsReplied: ticketStats[0]?.ticketsReplied ?? 0,
    avgResponseTimeMs: Number(responseTimeStats[0]?.avgResponseTimeMs) || 0,
  };
}
