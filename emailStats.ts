import { db } from "@ticket-app/db";
import { emailMessages } from "@ticket-app/db/schema/_mailboxes";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export interface EmailStatistics {
  totalReceived: number;
  totalSent: number;
  totalBounced: number;
  averageResponseTime: number | null;
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
      totalReceived: sql`COUNT(*) FILTER (WHERE ${emailMessages.direction} = 'inbound')`.as(
        "total_received",
      ),
      totalSent: sql`COUNT(*) FILTER (WHERE ${emailMessages.direction} = 'outbound')`.as(
        "total_sent",
      ),
      totalBounced: sql`COUNT(*) FILTER (WHERE ${emailMessages.bounce})`.as("total_bounced"),
    })
    .from(emailMessages)
    .where(and(...conditions));

  return {
    totalReceived: Number(stats[0]?.total_received ?? 0),
    totalSent: Number(stats[0]?.total_sent ?? 0),
    totalBounced: Number(stats[0]?.total_bounced ?? 0),
    averageResponseTime: null,
  };
}
