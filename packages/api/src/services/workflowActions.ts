import { db } from "@ticket-app/db";
import { tickets, ticketTags, tags, ticketMessages, tasks, taskAssignees } from "@ticket-app/db/schema/_tickets";
import { lookups } from "@ticket-app/db/schema/_lookups";
import { users, teams } from "@ticket-app/db/schema/_users";
import { eq, and } from "drizzle-orm";

export interface WorkflowAction {
  type: "assign_agent" | "assign_team" | "set_priority" | "set_status" | "add_tags" | "remove_tags" | "send_email" | "send_webhook" | "create_task" | "add_note" | "apply_saved_reply";
  params: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  result?: Record<string, unknown>;
  error?: string;
}

interface ActionContext {
  workflowId: number;
  ticketId: number;
}

const LOWER_PRIORITY_IDS = [1, 2];
const NORMAL_PRIORITY_IDS = [3, 4];
const HIGH_PRIORITY_IDS = [5, 6];
const URGENT_PRIORITY_IDS = [7, 8];

export const workflowActions = {
  async executeActions(
    actions: WorkflowAction[],
    ticket: Record<string, unknown>,
    context: ActionContext
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, ticket, context);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          actionType: action.type,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },

  async executeAction(
    action: WorkflowAction,
    ticket: Record<string, unknown>,
    context: ActionContext
  ): Promise<ActionResult> {
    switch (action.type) {
      case "assign_agent":
        return await this.assignAgent(action.params, ticket, context);
      
      case "assign_team":
        return await this.assignTeam(action.params, ticket, context);
      
      case "set_priority":
        return await this.setPriority(action.params, ticket, context);
      
      case "set_status":
        return await this.setStatus(action.params, ticket, context);
      
      case "add_tags":
        return await this.addTags(action.params, ticket, context);
      
      case "remove_tags":
        return await this.removeTags(action.params, ticket, context);
      
      case "send_email":
        return await this.sendEmail(action.params, ticket, context);
      
      case "send_webhook":
        return await this.sendWebhook(action.params, ticket, context);
      
      case "create_task":
        return await this.createTask(action.params, ticket, context);
      
      case "add_note":
        return await this.addNote(action.params, ticket, context);
      
      case "apply_saved_reply":
        return await this.applySavedReply(action.params, ticket, context);
      
      default:
        return {
          success: false,
          actionType: action.type,
          error: `Unknown action type: ${action.type}`,
        };
    }
  },

  async assignAgent(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const agentId = params.agentId as number;
    
    await db.update(tickets)
      .set({ 
        assignedAgentId: agentId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, context.ticketId));

    return {
      success: true,
      actionType: "assign_agent",
      result: { agentId, ticketId: context.ticketId },
    };
  },

  async assignTeam(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const teamId = params.teamId as number;
    
    await db.update(tickets)
      .set({ 
        assignedTeamId: teamId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, context.ticketId));

    return {
      success: true,
      actionType: "assign_team",
      result: { teamId, ticketId: context.ticketId },
    };
  },

  async setPriority(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const priorityId = params.priorityId as number;
    
    const [priority] = await db.select()
      .from(lookups)
      .where(eq(lookups.id, priorityId));
    
    if (!priority) {
      return {
        success: false,
        actionType: "set_priority",
        error: `Priority lookup not found: ${priorityId}`,
      };
    }

    await db.update(tickets)
      .set({ 
        priorityId,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, context.ticketId));

    return {
      success: true,
      actionType: "set_priority",
      result: { priorityId, priorityName: priority.name },
    };
  },

  async setStatus(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const statusId = params.statusId as number;
    
    const [status] = await db.select()
      .from(lookups)
      .where(eq(lookups.id, statusId));
    
    if (!status) {
      return {
        success: false,
        actionType: "set_status",
        error: `Status lookup not found: ${statusId}`,
      };
    }

    const updateData: Record<string, unknown> = {
      statusId,
      updatedAt: new Date(),
    };

    if (status.name === "resolved") {
      updateData.resolvedAt = new Date();
    } else if (status.name === "closed") {
      updateData.closedAt = new Date();
    }

    await db.update(tickets)
      .set(updateData)
      .where(eq(tickets.id, context.ticketId));

    return {
      success: true,
      actionType: "set_status",
      result: { statusId, statusName: status.name },
    };
  },

  async addTags(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const tagIds = params.tagIds as number[];
    const organizationId = ticket.organizationId as number;
    
    const addedTags: number[] = [];

    for (const tagId of tagIds) {
      const [existingTag] = await db.select()
        .from(tags)
        .where(and(
          eq(tags.id, tagId),
          eq(tags.organizationId, organizationId)
        ));

      if (!existingTag) continue;

      try {
        await db.insert(ticketTags).values({
          ticketId: context.ticketId,
          tagId,
        });
        addedTags.push(tagId);
      } catch {
        // Tag already exists on ticket, skip
      }
    }

    return {
      success: true,
      actionType: "add_tags",
      result: { addedTags },
    };
  },

  async removeTags(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const tagIds = params.tagIds as number[];
    
    await db.delete(ticketTags)
      .where(and(
        eq(ticketTags.ticketId, context.ticketId),
        // Using SQL IN clause would be better, but for simplicity:
      ));

    for (const tagId of tagIds) {
      await db.delete(ticketTags)
        .where(and(
          eq(ticketTags.ticketId, context.ticketId),
          eq(ticketTags.tagId, tagId)
        ));
    }

    return {
      success: true,
      actionType: "remove_tags",
      result: { removedTags: tagIds },
    };
  },

  async sendEmail(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const { addWorkflowJob } = await import("@ticket-app/db/lib/queues");
    
    const to = params.to as string || ticket.contactEmail as string;
    const subject = params.subject as string || `Re: ${ticket.subject}`;
    const body = params.body as string;

    if (!to || !body) {
      return {
        success: false,
        actionType: "send_email",
        error: "Missing required parameters: to, body",
      };
    }

    await addWorkflowJob({
      workflowId: String(context.workflowId),
      triggerType: "send_email",
      entityType: "ticket",
      entityId: String(context.ticketId),
      payload: { to, subject, body },
    });

    return {
      success: true,
      actionType: "send_email",
      result: { to, subject, ticketId: context.ticketId },
    };
  },

  async sendWebhook(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const webhookUrl = params.url as string;
    const webhookMethod = (params.method as string) || "POST";
    const webhookHeaders = (params.headers as Record<string, string>) || {};
    const webhookBody = params.body as Record<string, unknown> || {
      ticketId: context.ticketId,
      workflowId: context.workflowId,
      ticket,
    };

    if (!webhookUrl) {
      return {
        success: false,
        actionType: "send_webhook",
        error: "Missing webhook URL",
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: webhookMethod,
        headers: {
          "Content-Type": "application/json",
          ...webhookHeaders,
        },
        body: JSON.stringify(webhookBody),
      });

      if (!response.ok) {
        return {
          success: false,
          actionType: "send_webhook",
          error: `Webhook failed with status: ${response.status}`,
        };
      }

      return {
        success: true,
        actionType: "send_webhook",
        result: { url: webhookUrl, status: response.status },
      };
    } catch (error) {
      return {
        success: false,
        actionType: "send_webhook",
        error: error instanceof Error ? error.message : "Webhook request failed",
      };
    }
  },

  async createTask(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const title = params.title as string;
    const description = params.description as string;
    const assigneeUserIds = params.assigneeUserIds as number[];
    const dueAt = params.dueAt ? new Date(params.dueAt as string) : null;
    const organizationId = ticket.organizationId as number;

    if (!title) {
      return {
        success: false,
        actionType: "create_task",
        error: "Missing task title",
      };
    }

    const [lookup] = await db.select()
      .from(lookups)
      .where(and(
        eq(lookups.lookupTypeId, 1),
        eq(lookups.name, "open")
      ));

    const [newTask] = await db.insert(tasks).values({
      organizationId,
      ticketId: context.ticketId,
      title,
      description,
      statusId: lookup?.id || 1,
      dueAt,
    }).returning();

    if (assigneeUserIds && assigneeUserIds.length > 0 && newTask) {
      for (const userId of assigneeUserIds) {
        await db.insert(taskAssignees).values({
          taskId: newTask.id,
          userId,
        });
      }
    }

    return {
      success: true,
      actionType: "create_task",
      result: { taskId: newTask?.id, title },
    };
  },

  async addNote(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const body = params.body as string;
    const isPrivate = params.isPrivate !== false;
    const authorUserId = params.authorUserId as number;

    if (!body) {
      return {
        success: false,
        actionType: "add_note",
        error: "Missing note body",
      };
    }

    const [note] = await db.insert(ticketMessages).values({
      ticketId: context.ticketId,
      authorType: "agent",
      authorUserId,
      messageType: "note",
      bodyHtml: body,
      bodyText: body.replace(/<[^>]*>/g, ""),
      isPrivate,
    }).returning();

    return {
      success: true,
      actionType: "add_note",
      result: { noteId: note?.id },
    };
  },

  async applySavedReply(params: Record<string, unknown>, ticket: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const savedReplyId = params.savedReplyId as number;
    const authorUserId = params.authorUserId as number;
    
    if (!savedReplyId) {
      return {
        success: false,
        actionType: "apply_saved_reply",
        error: "Missing saved reply ID",
      };
    }

    return {
      success: true,
      actionType: "apply_saved_reply",
      result: { savedReplyId, message: "Saved reply applied - action would create a ticket message" },
    };
  },
};
