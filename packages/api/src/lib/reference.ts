import { db } from "@ticket-app/db";
import { tickets } from "@ticket-app/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function generateReferenceNumber(organizationId: number): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tickets)
    .where(
      sql`${tickets.organizationId} = ${organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`
    );

  const sequence = (result[0]?.count ?? 0) + 1;
  return `${prefix}${sequence.toString().padStart(6, "0")}`;
}
