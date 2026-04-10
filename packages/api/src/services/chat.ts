import { db } from "@ticket-app/db";
import {
  chatSessions,
  chatMessages,
  tickets,
  lookups,
  ticketMessages,
} from "@ticket-app/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateReferenceNumber } from "../lib/reference";

export interface ConvertChatToTicketOptions {
  chatSessionId: number;
  organizationId: number;
  createdBy?: number;
  priorityId?: number;
}

export async function convertChatToTicket(options: ConvertChatToTicketOptions): Promise<{
  ticket: typeof tickets.$inferSelect;
  session: typeof chatSessions.$inferSelect;
}> {
  const { chatSessionId, organizationId, createdBy, priorityId } = options;

  const session = await db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, chatSessionId), eq(chatSessions.organizationId, organizationId)),
    with: {
      messages: {
        orderBy: (chatMessages, { asc }) => [asc(chatMessages.createdAt)],
      },
      contact: true,
    },
  });

  if (!session) {
    throw new Error("Chat session not found");
  }

  if (session.ticketId) {
    throw new Error("Chat session already converted to ticket");
  }

  const chatMessagesHistory = session.messages || [];

  const defaultStatusId = (
    await db.query.lookups.findFirst({
      where: and(
        sql`${lookups.lookupTypeId} = (SELECT id FROM lookup_types WHERE name = 'ticket_status')`,
        eq(lookups.isDefault, true),
      ),
    })
  )?.id;

  const defaultPriorityId =
    priorityId ??
    (
      await db.query.lookups.findFirst({
        where: and(
          sql`${lookups.lookupTypeId} = (SELECT id FROM lookup_types WHERE name = 'ticket_priority')`,
          eq(lookups.isDefault, true),
        ),
      })
    )?.id;

  const channelChatId = (
    await db.query.lookups.findFirst({
      where: sql`${lookups.lookupTypeId} = (SELECT id FROM lookup_types WHERE name = 'channel_type') AND ${lookups.name} = 'chat'`,
    })
  )?.id;

  const subject = `Chat Session ${session.uuid.slice(0, 8)}`;

  const descriptionHtml = buildChatDescriptionHtml(
    chatMessagesHistory,
    session.preChatData as Record<string, unknown>,
  );

  const referenceNumber = await generateReferenceNumber(organizationId);

  const [ticket] = await db
    .insert(tickets)
    .values({
      organizationId,
      referenceNumber,
      subject,
      descriptionHtml,
      statusId: defaultStatusId,
      priorityId: defaultPriorityId,
      channelId: channelChatId,
      contactId: session.contactId,
      chatSessionId: chatSessionId,
      createdBy,
    })
    .returning();

  const initialMessage = `Chat session converted. Pre-chat data: ${JSON.stringify(session.preChatData || {})}`;
  await db.insert(ticketMessages).values({
    ticketId: ticket!.id,
    authorType: "system",
    messageType: "activity",
    bodyHtml: `<p>${initialMessage}</p>`,
    bodyText: initialMessage,
    createdBy,
  });

  for (const msg of chatMessagesHistory) {
    await db.insert(ticketMessages).values({
      ticketId: ticket!.id,
      authorType: msg.authorType,
      authorUserId: msg.authorUserId,
      authorContactId: msg.authorContactId,
      messageType: "reply",
      bodyHtml: `<p>${msg.body}</p>`,
      bodyText: msg.body,
      createdBy,
    });
  }

  await db
    .update(chatSessions)
    .set({
      ticketId: ticket!.id,
      status: "converted",
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, chatSessionId));

  return {
    ticket,
    session: { ...session, ticketId: ticket!.id, status: "converted" } as typeof session,
  };
}

function buildChatDescriptionHtml(
  messages: Array<{ authorType: string; body: string | null; createdAt: Date }>,
  preChatData: Record<string, unknown>,
): string {
  let html = `<div class="chat-transcript">`;

  if (preChatData && Object.keys(preChatData).length > 0) {
    html += `<div class="pre-chat-data"><h4>Pre-Chat Information</h4><ul>`;
    for (const [key, value] of Object.entries(preChatData)) {
      html += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    html += `</ul></div>`;
  }

  html += `<div class="chat-messages"><h4>Chat Transcript</h4>`;
  for (const msg of messages) {
    const author =
      msg.authorType === "agent" ? "Agent" : msg.authorType === "contact" ? "Customer" : "System";
    const time = new Date(msg.createdAt).toLocaleString();
    html += `<div class="message ${msg.authorType}">
      <span class="author">${author}</span>
      <span class="time">${time}</span>
      <p>${msg.body || ""}</p>
    </div>`;
  }
  html += `</div></div>`;

  return html;
}

export async function endChatSession(
  sessionId: number,
  endedBy: "agent" | "contact" | "system",
  autoConvertToTicket: boolean = true,
): Promise<{
  session: typeof chatSessions.$inferSelect;
  ticket?: typeof tickets.$inferSelect;
}> {
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
  });

  if (!session) {
    throw new Error("Chat session not found");
  }

  const widget = await db.query.chatWidgets.findFirst({
    where: eq(chatWidgets.id, session.widgetId),
  });

  const autoTicketConversion = widget?.autoTicketConversion ?? true;

  const updates: Record<string, unknown> = {
    status: "ended",
    endedAt: new Date(),
    endedBy,
    updatedAt: new Date(),
  };

  const [updatedSession] = await db
    .update(chatSessions)
    .set(updates)
    .where(eq(chatSessions.id, sessionId))
    .returning();

  let ticket: typeof tickets.$inferSelect | undefined;

  if (autoConvertToTicket && autoTicketConversion && session.status !== "converted") {
    const result = await convertChatToTicket({
      chatSessionId: sessionId,
      organizationId: session.organizationId,
    });
    ticket = result.ticket;
  }

  return { session: updatedSession!, ticket };
}

export async function getChatStats(organizationId: number, widgetId?: number) {
  const conditions = [eq(chatSessions.organizationId, organizationId)];

  if (widgetId) {
    conditions.push(eq(chatSessions.widgetId, widgetId));
  }

  const allSessions = await db.query.chatSessions.findMany({
    where: and(...conditions),
  });

  const sessionsByStatus = {
    waiting: allSessions.filter((s) => s.status === "waiting").length,
    active: allSessions.filter((s) => s.status === "active").length,
    ended: allSessions.filter((s) => s.status === "ended").length,
    converted: allSessions.filter((s) => s.status === "converted").length,
    total: allSessions.length,
  };

  const ratedSessions = allSessions.filter((s) => s.rating != null);
  const avgRating =
    ratedSessions.length > 0
      ? ratedSessions.reduce((acc, s) => acc + (s.rating ?? 0), 0) / ratedSessions.length
      : null;

  const totalMessages = await db
    .select({ count: sql<number>`count(*)` })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(and(...conditions));

  return {
    totalSessions: allSessions.length,
    sessionsByStatus,
    conversionRate:
      sessionsByStatus.total > 0 ? (sessionsByStatus.converted / sessionsByStatus.total) * 100 : 0,
    averageRating: avgRating,
    totalMessages: Number(totalMessages[0]?.count ?? 0),
  };
}
