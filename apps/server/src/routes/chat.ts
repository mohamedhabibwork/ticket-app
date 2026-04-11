import { WebSocketServer, WebSocket } from "ws";
import { db } from "@ticket-app/db";
import { chatSessions, chatMessages, chatWidgets } from "@ticket-app/db/schema";
import { eq, and } from "drizzle-orm";

interface ChatConnection {
  ws: WebSocket;
  sessionId: number;
  organizationId: number;
  userId?: number;
  contactId?: number;
  isAgent: boolean;
}

interface ChatMessage {
  type: "message" | "typing" | "join" | "leave" | "end" | "ping" | "pong";
  payload: Record<string, unknown>;
}

interface TypingState {
  [sessionId: number]: {
    agentTyping: boolean;
    contactTyping: boolean;
  };
}

const connections = new Map<string, ChatConnection>();
const typingStates = new Map<number, TypingState[number]>();
const pingIntervals = new Map<string, NodeJS.Timeout>();

function getConnectionKey(organizationId: number, sessionId: number, isAgent: boolean): string {
  return `${organizationId}:${sessionId}:${isAgent}`;
}

function broadcastToSession(sessionId: number, message: ChatMessage, excludeKey?: string) {
  connections.forEach((conn, key) => {
    if (conn.sessionId === sessionId && key !== excludeKey) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  });
}

function handleTypingIndicator(connection: ChatConnection, isTyping: boolean) {
  let state = typingStates.get(connection.sessionId);
  if (!state) {
    state = { agentTyping: false, contactTyping: false };
    typingStates.set(connection.sessionId, state);
  }

  if (connection.isAgent) {
    state.agentTyping = isTyping;
  } else {
    state.contactTyping = isTyping;
  }

  const typingPayload = {
    sessionId: connection.sessionId,
    agentTyping: state.agentTyping,
    contactTyping: state.contactTyping,
  };

  broadcastToSession(
    connection.sessionId,
    {
      type: "typing",
      payload: typingPayload,
    },
    getConnectionKey(connection.organizationId, connection.sessionId, !connection.isAgent),
  );
}

async function handleChatMessage(connection: ChatConnection, payload: Record<string, unknown>) {
  const { body, attachments } = payload;

  if (!body || typeof body !== "string") {
    return;
  }

  const session = await db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, connection.sessionId),
      eq(chatSessions.organizationId, connection.organizationId),
    ),
  });

  if (!session || session.status === "ended" || session.status === "converted") {
    connection.ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: "Chat session is no longer active" },
      }),
    );
    return;
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      sessionId: connection.sessionId,
      authorType: connection.isAgent ? "agent" : "contact",
      authorUserId: connection.isAgent ? connection.userId : undefined,
      authorContactId: !connection.isAgent ? connection.contactId : undefined,
      messageType: "text",
      body: body as string,
      attachments: Array.isArray(attachments) ? attachments : [],
    })
    .returning();

  if (!message) {
    connection.ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: "Failed to save message" },
      }),
    );
    return;
  }

  broadcastToSession(connection.sessionId, {
    type: "message",
    payload: {
      id: message.id,
      uuid: message.uuid,
      sessionId: connection.sessionId,
      authorType: connection.isAgent ? "agent" : "contact",
      body: message.body,
      attachments: message.attachments,
      createdAt: message.createdAt,
    },
  });
}

async function handleEndChat(connection: ChatConnection) {
  const session = await db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, connection.sessionId),
      eq(chatSessions.organizationId, connection.organizationId),
    ),
  });

  if (!session) {
    connection.ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: "Chat session not found" },
      }),
    );
    return;
  }

  const widget = await db.query.chatWidgets.findFirst({
    where: eq(chatWidgets.id, session.widgetId),
  });

  const autoConvert = widget?.autoTicketConversion ?? true;

  await db
    .update(chatSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
      endedBy: connection.isAgent ? "agent" : "contact",
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, connection.sessionId));

  broadcastToSession(connection.sessionId, {
    type: "end",
    payload: {
      sessionId: connection.sessionId,
      autoConvertToTicket: autoConvert,
    },
  });

  connection.ws.close();
}

function startPingInterval(key: string, ws: WebSocket) {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping", payload: {} }));
    }
  }, 30000);
  pingIntervals.set(key, interval);
}

function stopPingInterval(key: string) {
  const interval = pingIntervals.get(key);
  if (interval) {
    clearInterval(interval);
    pingIntervals.delete(key);
  }
}

export function setupChatWebSocket(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = parseInt(url.searchParams.get("sessionId") || "0", 10);
    const organizationId = parseInt(url.searchParams.get("orgId") || "0", 10);
    const isAgentParam = url.searchParams.get("isAgent");

    if (!sessionId || !organizationId) {
      ws.close(4000, "Missing sessionId or orgId");
      return;
    }

    const session = await db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, sessionId), eq(chatSessions.organizationId, organizationId)),
    });

    if (!session) {
      ws.close(4001, "Session not found");
      return;
    }

    const isAgent = isAgentParam === "true";
    const key = getConnectionKey(organizationId, sessionId, isAgent);

    const connection: ChatConnection = {
      ws,
      sessionId,
      organizationId,
      isAgent,
      contactId: session.contactId != null ? session.contactId : undefined,
      userId: session.agentId != null && isAgent ? session.agentId : undefined,
    };

    connections.set(key, connection);

    if (isAgent && session.status === "waiting") {
      await db
        .update(chatSessions)
        .set({
          status: "active",
          agentId: session.agentId,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, sessionId));

      broadcastToSession(
        sessionId,
        {
          type: "message",
          payload: {
            id: null,
            sessionId,
            authorType: "system",
            body: "An agent has joined the chat",
            createdAt: new Date().toISOString(),
          },
        },
        key,
      );
    }

    startPingInterval(key, ws);

    ws.on("message", async (data) => {
      try {
        const message: ChatMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "message":
            await handleChatMessage(connection, message.payload);
            break;
          case "typing":
            handleTypingIndicator(connection, message.payload.isTyping === true);
            break;
          case "end":
            await handleEndChat(connection);
            break;
          case "pong":
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Invalid message format" },
          }),
        );
      }
    });

    ws.on("close", () => {
      const key = getConnectionKey(organizationId, sessionId, isAgent);
      connections.delete(key);
      stopPingInterval(key);

      broadcastToSession(sessionId, {
        type: "leave",
        payload: {
          sessionId,
          isAgent,
        },
      });
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  console.log("Chat WebSocket server initialized");
  return wss;
}

export function getActiveConnectionsCount(sessionId?: number): number {
  if (sessionId) {
    let count = 0;
    connections.forEach((conn) => {
      if (conn.sessionId === sessionId) count++;
    });
    return count;
  }
  return connections.size;
}
