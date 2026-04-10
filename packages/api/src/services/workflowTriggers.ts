import { db } from "@ticket-app/db";
import { workflows } from "@ticket-app/db/schema/_workflows";
import { addWorkflowJob, type WorkflowJobData } from "@ticket-app/db/lib/queues";
import { eq, and } from "drizzle-orm";

export type WorkflowTriggerType =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_status_changed"
  | "ticket_priority_changed"
  | "ticket_assigned"
  | "sla_breached"
  | "time_elapsed"
  | "ticket_thread_omitted";

interface TicketData {
  id: number;
  organizationId: number;
  statusId: number;
  priorityId: number;
  assignedAgentId?: number | null;
  assignedTeamId?: number | null;
  subject: string;
  [key: string]: unknown;
}

interface TriggerOptions {
  previousTicket?: Partial<TicketData>;
  triggeredBy?: "user" | "workflow" | "system";
}

export const workflowTriggers = {
  async onTicketCreated(ticket: TicketData, options: TriggerOptions = {}): Promise<void> {
    if (options.triggeredBy === "workflow") {
      return;
    }

    await this.triggerWorkflows("ticket_created", ticket);
  },

  async onTicketUpdated(
    ticket: TicketData,
    previousTicket: Partial<TicketData>,
    options: TriggerOptions = {},
  ): Promise<void> {
    if (options.triggeredBy === "workflow") {
      return;
    }

    await this.triggerWorkflows("ticket_updated", ticket);

    if (previousTicket.statusId && previousTicket.statusId !== ticket.statusId) {
      await this.triggerWorkflows("ticket_status_changed", ticket, {
        previousStatusId: previousTicket.statusId,
      });
    }

    if (previousTicket.priorityId && previousTicket.priorityId !== ticket.priorityId) {
      await this.triggerWorkflows("ticket_priority_changed", ticket, {
        previousPriorityId: previousTicket.priorityId,
      });
    }

    const wasAssigned =
      !previousTicket.assignedAgentId &&
      !previousTicket.assignedTeamId &&
      (ticket.assignedAgentId || ticket.assignedTeamId);

    const assignmentChanged =
      previousTicket.assignedAgentId !== ticket.assignedAgentId ||
      previousTicket.assignedTeamId !== ticket.assignedTeamId;

    if (wasAssigned || assignmentChanged) {
      await this.triggerWorkflows("ticket_assigned", ticket, {
        previousAgentId: previousTicket.assignedAgentId,
        previousTeamId: previousTicket.assignedTeamId,
      });
    }
  },

  async triggerWorkflows(
    triggerType: WorkflowTriggerType,
    ticket: TicketData,
    additionalPayload?: Record<string, unknown>,
  ): Promise<void> {
    const activeWorkflows = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.organizationId, ticket.organizationId),
          eq(workflows.isActive, true),
          eq(workflows.trigger, triggerType),
        ),
      );

    for (const workflow of activeWorkflows) {
      const jobData: WorkflowJobData = {
        workflowId: String(workflow.id),
        triggerType,
        entityType: "ticket",
        entityId: String(ticket.id),
        payload: {
          ticket,
          ...additionalPayload,
        },
      };

      await addWorkflowJob(jobData);
    }
  },

  async triggerSlaBreachedWorkflows(ticket: TicketData): Promise<void> {
    await this.triggerWorkflows("sla_breached", ticket);
  },

  async triggerTimeElapsedWorkflows(
    ticket: TicketData,
    elapsedType: "first_response" | "next_response" | "resolution",
  ): Promise<void> {
    await this.triggerWorkflows("time_elapsed", ticket, { elapsedType });
  },
};

export async function getWorkflowsByTrigger(
  organizationId: number,
  triggerType: WorkflowTriggerType,
) {
  return await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.organizationId, organizationId),
        eq(workflows.isActive, true),
        eq(workflows.trigger, triggerType),
      ),
    );
}

export function createTicketChangeDetector() {
  const previousTickets = new Map<number, Partial<TicketData>>();

  return {
    detectChanges(ticket: TicketData): Partial<TicketData> | null {
      const previous = previousTickets.get(ticket.id);
      previousTickets.set(ticket.id, { ...ticket });

      if (!previous) {
        return null;
      }

      const changes: Partial<TicketData> = {};

      if (previous.statusId !== ticket.statusId) {
        changes.statusId = previous.statusId;
      }
      if (previous.priorityId !== ticket.priorityId) {
        changes.priorityId = previous.priorityId;
      }
      if (previous.assignedAgentId !== ticket.assignedAgentId) {
        changes.assignedAgentId = previous.assignedAgentId;
      }
      if (previous.assignedTeamId !== ticket.assignedTeamId) {
        changes.assignedTeamId = previous.assignedTeamId;
      }

      return Object.keys(changes).length > 0 ? changes : null;
    },

    getPrevious(ticketId: number): Partial<TicketData> | undefined {
      return previousTickets.get(ticketId);
    },

    clear(ticketId: number): void {
      previousTickets.delete(ticketId);
    },
  };
}
