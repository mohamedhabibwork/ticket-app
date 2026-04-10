import { Worker, Job } from "bullmq";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { tickets, teamMembers, teams } from "@ticket-app/db/schema";
import {
  addAutoAssignJob,
  autoAssignQueue,
  type AutoAssignJobData,
} from "@ticket-app/db/lib/queues";
import { getRedis } from "@ticket-app/queue";

export async function executeAutoAssignment(job: Job<AutoAssignJobData>): Promise<void> {
  const { ticketId, teamId } = job.data;

  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)),
    with: {
      assignedTeam: true,
      mailbox: true,
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  if (ticket.assignedAgentId) {
    return;
  }

  let targetTeamId = teamId || ticket.assignedTeamId;

  if (!targetTeamId) {
    const mailbox = ticket.mailbox as { defaultTeamId: number | null } | null;
    if (mailbox?.defaultTeamId) {
      targetTeamId = mailbox.defaultTeamId;
    }
  }

  if (!targetTeamId) {
    return;
  }

  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, targetTeamId), eq(teams.isActive, true)),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!team || !team.members.length) {
    return;
  }

  const agentId = await selectAgent(team.id, team.autoAssignMethod);

  if (!agentId) {
    return;
  }

  await db
    .update(tickets)
    .set({
      assignedAgentId: agentId,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));
}

async function selectAgent(teamId: number, method: string): Promise<number | null> {
  const activeMembers = await db.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.teamId, teamId),
      sql`${teamMembers.userId} IN (
        SELECT id FROM users WHERE is_active = true AND deleted_at IS NULL
      )`,
    ),
    with: {
      user: true,
    },
  });

  if (!activeMembers.length) {
    return null;
  }

  switch (method) {
    case "round_robin": {
      const lastAssigned = await db.query.tickets.findFirst({
        where: and(eq(tickets.assignedTeamId, teamId), isNull(tickets.deletedAt)),
        orderBy: [desc(tickets.updatedAt)],
      });

      const memberIds = activeMembers.map((m) => m.userId);
      if (!lastAssigned?.assignedAgentId || !memberIds.includes(lastAssigned.assignedAgentId)) {
        return memberIds[0] ?? null;
      }

      const lastIndex = memberIds.indexOf(lastAssigned.assignedAgentId);
      const nextIndex = (lastIndex + 1) % memberIds.length;
      return memberIds[nextIndex] ?? null;
    }

    case "load_balanced": {
      const agentCounts = await db
        .select({
          agentId: tickets.assignedAgentId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.assignedTeamId, teamId),
            isNull(tickets.deletedAt),
            sql`${tickets.assignedAgentId} IN (${sql.join(
              activeMembers.map((m) => sql`${m.userId}`),
              sql`, `,
            )})`,
          ),
        )
        .groupBy(tickets.assignedAgentId)
        .orderBy(sql`count ASC`);

      if (!agentCounts.length) {
        return activeMembers[0]?.userId ?? null;
      }

      return agentCounts[0]!.agentId;
    }

    case "least_assigned": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const agentCounts = await db
        .select({
          agentId: tickets.assignedAgentId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.assignedTeamId, teamId),
            isNull(tickets.deletedAt),
            sql`${tickets.assignedAgentId} IN (${sql.join(
              activeMembers.map((m) => sql`${m.userId}`),
              sql`, `,
            )})`,
            sql`${tickets.createdAt} >= ${thirtyDaysAgo}`,
          ),
        )
        .groupBy(tickets.assignedAgentId)
        .orderBy(sql`count ASC`);

      if (!agentCounts.length) {
        return activeMembers[0]?.userId ?? null;
      }

      return agentCounts[0]!.agentId;
    }

    default:
      return activeMembers[0]?.userId ?? null;
  }
}

export function createAutoAssignWorker() {
  return new Worker<AutoAssignJobData>("ticket-auto-assign", executeAutoAssignment, {
    connection: getRedis(),
    concurrency: 5,
  });
}

export async function enqueueAutoAssign(ticketId: number, teamId?: number): Promise<void> {
  await addAutoAssignJob({ ticketId, teamId });
}

export { autoAssignQueue };
export type { AutoAssignJobData };
export { Worker, Job };
