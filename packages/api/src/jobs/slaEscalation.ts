import { Queue, Worker, Job } from "bullmq";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { ticketEscalations, ticketSla } from "@ticket-app/db/schema/_sla";
import { tickets, ticketMessages } from "@ticket-app/db/schema/_tickets";
import { users, teamMembers } from "@ticket-app/db/schema/_users";
import { createNotification, NOTIFICATION_TYPES } from "@ticket-app/services/notifications";

export const SLA_ESCALATION_QUEUE = "sla-escalation";

export type EscalationAction =
  | "reassign_to_senior_agent"
  | "escalate_to_team_lead"
  | "notify_managers"
  | "increase_priority";

export type SlaEscalationJobData = {
  ticketId: number;
  breachType: "first_response" | "resolution";
  slaPolicyTargetId: number;
  escalationLevel: number;
};

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
};

export const slaEscalationQueue = new Queue<SlaEscalationJobData>(SLA_ESCALATION_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function addSlaEscalationJob(
  ticketId: number,
  breachType: "first_response" | "resolution",
  slaPolicyTargetId: number,
  escalationLevel: number = 1,
): Promise<Job<SlaEscalationJobData>> {
  return slaEscalationQueue.add(
    "escalate",
    { ticketId, breachType, slaPolicyTargetId, escalationLevel },
    {
      jobId: `sla-escalation-${ticketId}-${breachType}-${Date.now()}`,
    },
  );
}

export function createSlaEscalationWorker() {
  return new Worker<SlaEscalationJobData>(
    SLA_ESCALATION_QUEUE,
    async (job) => {
      const { ticketId, breachType, slaPolicyTargetId, escalationLevel } = job.data;

      const sla = await db.query.ticketSla.findFirst({
        where: eq(ticketSla.ticketId, ticketId),
        with: {
          ticket: {
            with: {
              assignedAgent: true,
              assignedTeam: true,
              organization: true,
            },
          },
          slaPolicy: {
            with: {
              targets: {
                with: {
                  escalateAgent: true,
                  escalateTeam: true,
                  priority: true,
                },
              },
            },
          },
        },
      });

      if (!sla || !sla.ticket) {
        return;
      }

      const ticket = sla.ticket;
      const target = sla.slaPolicy?.targets?.find((t) => t.id === slaPolicyTargetId);

      if (!target) {
        return;
      }

      const previousAgentId = ticket.assignedAgentId;
      const previousTeamId = ticket.assignedTeamId;

      await executeEscalationActions({
        ticketId,
        breachType,
        target,
        escalationLevel,
        ticket,
        previousAgentId,
        previousTeamId,
      });
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

interface EscalationContext {
  ticketId: number;
  breachType: "first_response" | "resolution";
  target: {
    id: number;
    escalateAgentId: number | null;
    escalateTeamId: number | null;
    priority: { id: number; name: string } | null;
  };
  escalationLevel: number;
  ticket: {
    id: number;
    referenceNumber: string;
    subject: string;
    organizationId: number;
    assignedAgentId: number | null;
    assignedTeamId: number | null;
    priorityId: number;
    assignedAgent: { id: number; email: string; firstName: string; lastName: string } | null;
    assignedTeam: { id: number; name: string } | null;
    organization: { id: number; name: string };
  };
  previousAgentId: number | null;
  previousTeamId: number | null;
}

async function executeEscalationActions(context: EscalationContext): Promise<void> {
  const { ticketId, breachType, target, escalationLevel, ticket, previousAgentId, previousTeamId } =
    context;

  const escalationType =
    breachType === "first_response" ? "first_response_breach" : "resolution_breach";

  if (target.escalateAgentId) {
    await db
      .update(tickets)
      .set({
        assignedAgentId: target.escalateAgentId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId));

    await recordEscalation({
      ticketId,
      slaPolicyTargetId: target.id,
      escalationLevel,
      escalateToAgentId: target.escalateAgentId,
      escalationType,
      breachedAt: new Date(),
      reason: `SLA ${breachType} breach - Level ${escalationLevel} escalation`,
      previousAssigneeAgentId: previousAgentId,
      previousAssigneeTeamId: previousTeamId,
    });

    await addEscalationNote({
      ticketId,
      escalationLevel,
      breachType,
      ticketReference: ticket.referenceNumber,
    });

    const escalateAgent = await db.query.users.findFirst({
      where: eq(users.id, target.escalateAgentId),
    });

    if (escalateAgent) {
      await createNotification({
        userId: escalateAgent.id,
        organizationId: ticket.organizationId,
        type: NOTIFICATION_TYPES.SLA_BREACH,
        title: `SLA Escalation: Ticket #${ticket.referenceNumber}`,
        body: `Ticket has been escalated to you due to ${breachType} SLA breach (Level ${escalationLevel}). Subject: ${ticket.subject}`,
        data: {
          ticketId,
          breachType,
          escalationLevel,
          ticketReference: ticket.referenceNumber,
          previousAgentId,
        },
      });
    }
  }

  if (target.escalateTeamId) {
    await db
      .update(tickets)
      .set({
        assignedTeamId: target.escalateTeamId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId));

    await recordEscalation({
      ticketId,
      slaPolicyTargetId: target.id,
      escalationLevel,
      escalateToTeamId: target.escalateTeamId,
      escalationType,
      breachedAt: new Date(),
      reason: `SLA ${breachType} breach - Level ${escalationLevel} escalation`,
      previousAssigneeAgentId: previousAgentId,
      previousAssigneeTeamId: previousTeamId,
    });

    await notifyTeamMembers({
      teamId: target.escalateTeamId,
      organizationId: ticket.organizationId,
      ticketId,
      breachType,
      escalationLevel,
      ticketReference: ticket.referenceNumber,
    });
  }

  await notifyManagers({
    ticketId,
    organizationId: ticket.organizationId,
    breachType,
    escalationLevel,
    ticketReference: ticket.referenceNumber,
    ticketSubject: ticket.subject,
  });
}

async function recordEscalation(params: {
  ticketId: number;
  slaPolicyTargetId: number;
  escalationLevel: number;
  escalateToAgentId?: number | null;
  escalateToTeamId?: number | null;
  escalationType: string;
  breachedAt: Date;
  reason?: string;
  previousAssigneeAgentId?: number | null;
  previousAssigneeTeamId?: number | null;
}): Promise<void> {
  await db.insert(ticketEscalations).values({
    ticketId: params.ticketId,
    slaPolicyTargetId: params.slaPolicyTargetId,
    escalationLevel: params.escalationLevel,
    escalateToAgentId: params.escalateToAgentId,
    escalateToTeamId: params.escalateToTeamId,
    escalationType: params.escalationType,
    breachedAt: params.breachedAt,
    reason: params.reason,
    previousAssigneeAgentId: params.previousAssigneeAgentId,
    previousAssigneeTeamId: params.previousAssigneeTeamId,
  });
}

async function addEscalationNote(params: {
  ticketId: number;
  escalationLevel: number;
  breachType: string;
  ticketReference: string;
}): Promise<void> {
  await db.insert(ticketMessages).values({
    ticketId: params.ticketId,
    authorType: "system",
    authorUserId: null,
    messageType: "note",
    bodyHtml: `<p><strong>SLA Escalation (Level ${params.escalationLevel})</strong><br>Ticket #${params.ticketReference} escalated due to ${params.breachType} breach. Reassigned to agent.</p>`,
    bodyText: `SLA Escalation (Level ${params.escalationLevel}): Ticket #${params.ticketReference} escalated due to ${params.breachType} breach. Reassigned to agent.`,
    isPrivate: true,
  });
}

async function notifyTeamMembers(params: {
  teamId: number;
  organizationId: number;
  ticketId: number;
  breachType: string;
  escalationLevel: number;
  ticketReference: string;
}): Promise<void> {
  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, params.teamId),
    with: { user: true },
  });

  for (const member of members) {
    await createNotification({
      userId: member.userId,
      organizationId: params.organizationId,
      type: NOTIFICATION_TYPES.SLA_BREACH,
      title: `SLA Escalation: Ticket #${params.ticketReference}`,
      body: `Ticket has been escalated to your team due to ${params.breachType} SLA breach (Level ${params.escalationLevel}).`,
      data: {
        ticketId: params.ticketId,
        breachType: params.breachType,
        escalationLevel: params.escalationLevel,
        ticketReference: params.ticketReference,
        teamId: params.teamId,
      },
    });
  }
}

async function notifyManagers(params: {
  ticketId: number;
  organizationId: number;
  breachType: string;
  escalationLevel: number;
  ticketReference: string;
  ticketSubject: string;
}): Promise<void> {
  const admins = await db.query.users.findMany({
    where: and(eq(users.organizationId, params.organizationId), eq(users.isPlatformAdmin, true)),
  });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      organizationId: params.organizationId,
      type: NOTIFICATION_TYPES.SLA_BREACH,
      title: `SLA Breach Alert: Ticket #${params.ticketReference}`,
      body: `Ticket #${params.ticketReference} (${params.ticketSubject}) has breached the ${params.breachType} SLA at escalation level ${params.escalationLevel}. Immediate attention may be required.`,
      data: {
        ticketId: params.ticketId,
        breachType: params.breachType,
        escalationLevel: params.escalationLevel,
        ticketReference: params.ticketReference,
        ticketSubject: params.ticketSubject,
      },
    });
  }
}

export async function getTicketEscalationHistory(ticketId: number): Promise<
  Array<{
    id: number;
    escalationLevel: number;
    escalationType: string;
    breachedAt: Date;
    reason: string | null;
    escalateToAgent: { id: number; firstName: string; lastName: string; email: string } | null;
    escalateToTeam: { id: number; name: string } | null;
    previousAssigneeAgent: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    previousAssigneeTeam: { id: number; name: string } | null;
  }>
> {
  const escalations = await db.query.ticketEscalations.findMany({
    where: eq(ticketEscalations.ticketId, ticketId),
    orderBy: [desc(ticketEscalations.createdAt)],
    with: {
      escalateToAgent: true,
      escalateToTeam: true,
      previousAssigneeAgent: true,
      previousAssigneeTeam: true,
    },
  });

  return escalations.map((e) => ({
    id: e.id,
    escalationLevel: e.escalationLevel,
    escalationType: e.escalationType,
    breachedAt: e.breachedAt,
    reason: e.reason,
    escalateToAgent: e.escalateToAgent,
    escalateToTeam: e.escalateToTeam,
    previousAssigneeAgent: e.previousAssigneeAgent,
    previousAssigneeTeam: e.previousAssigneeTeam,
  }));
}

export async function getEscalationLevel(ticketId: number): Promise<number> {
  const escalations = await db.query.ticketEscalations.findMany({
    where: eq(ticketEscalations.ticketId, ticketId),
  });

  if (escalations.length === 0) {
    return 0;
  }

  return Math.max(...escalations.map((e) => e.escalationLevel));
}

export { Worker, Job };
