import { emitToChat } from "../emit";
import type { Server as SocketIOServer } from "socket.io";
import type { AuthenticatedUser } from "../auth";
import { db } from "@ticket-app/db";
import { chatSessions, chatMessages } from "@ticket-app/db/schema";
import { eq, and } from "drizzle-orm";

interface TypingState {
  [sessionId: number]: {
    agentTyping: boolean;
    contactTyping: boolean;
  };
}

const typingStates: TypingState = {};

export function handleJoinSession(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { sessionId: number; isAgent: boolean },
): void {
  const { sessionId, isAgent } = payload;

  const session = db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.organizationId, user.organizationId),
    ),
  });

  if (!session) {
    socket.emit("error", { message: "Chat session not found" });
    return;
  }

  socket.join(`chat:${sessionId}`);
  socket.data.rooms = socket.data.rooms || new Set();
  socket.data.rooms.add(`chat:${sessionId}`);
  socket.data.chatSessionId = sessionId;
  socket.data.isAgentChat = isAgent;

  if (isAgent && session.status === "waiting") {
    db.update(chatSessions)
      .set({
        status: "active",
        agentId: user.userId,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    emitToChat(io, sessionId, "message", {
      id: null,
      sessionId,
      authorType: "system",
      body: "An agent has joined the chat",
      createdAt: new Date().toISOString(),
    });
  }

  socket.emit("join_session_ack", { sessionId, success: true });
}

export function handleLeaveSession(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { sessionId: number },
): void {
  const { sessionId } = payload;

  socket.leave(`chat:${sessionId}`);
  socket.data.rooms = socket.data.rooms || new Set();
  socket.data.rooms.delete(`chat:${sessionId}`);

  emitToChat(io, sessionId, "leave", {
    sessionId,
    isAgent: socket.data.isAgentChat,
  });

  socket.emit("leave_session_ack", { sessionId, success: true });
}

export function handleSendMessage(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { sessionId: number; body: string; attachments?: unknown[] },
): void {
  const { sessionId, body, attachments } = payload;

  if (!body || typeof body !== "string") {
    socket.emit("error", { message: "Message body is required" });
    return;
  }

  const session = db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.organizationId, user.organizationId),
    ),
  });

  if (!session || session.status === "ended" || session.status === "converted") {
    socket.emit("error", { message: "Chat session is no longer active" });
    return;
  }

  const isAgent = socket.data.isAgentChat;

  const [message] = db
    .insert(chatMessages)
    .values({
      sessionId,
      authorType: isAgent ? "agent" : "contact",
      authorUserId: isAgent ? user.userId : undefined,
      authorContactId: !isAgent ? (session.contactId ?? undefined) : undefined,
      messageType: "text",
      body,
      attachments: Array.isArray(attachments) ? attachments : [],
    })
    .returning();

  emitToChat(io, sessionId, "message", {
    id: message.id,
    uuid: message.uuid,
    sessionId,
    authorType: isAgent ? "agent" : "contact",
    body: message.body,
    attachments: message.attachments,
    createdAt: message.createdAt,
  });
}

export function handleTyping(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { sessionId: number; isTyping: boolean },
): void {
  const { sessionId, isTyping } = payload;

  let state = typingStates[sessionId];
  if (!state) {
    state = { agentTyping: false, contactTyping: false };
    typingStates[sessionId] = state;
  }

  if (socket.data.isAgentChat) {
    state.agentTyping = isTyping;
  } else {
    state.contactTyping = isTyping;
  }

  emitToChat(io, sessionId, "typing", {
    sessionId,
    agentTyping: state.agentTyping,
    contactTyping: state.contactTyping,
  });
}

export function registerChatHandlers(io: SocketIOServer, socket: any): void {
  const user: AuthenticatedUser = socket.data.user;

  socket.on("join_session", (payload: { sessionId: number; isAgent: boolean }) => {
    handleJoinSession(io, socket, user, payload);
  });

  socket.on("leave_session", (payload: { sessionId: number }) => {
    handleLeaveSession(io, socket, user, payload);
  });

  socket.on(
    "send_message",
    (payload: { sessionId: number; body: string; attachments?: unknown[] }) => {
      handleSendMessage(io, socket, user, payload);
    },
  );

  socket.on("typing", (payload: { sessionId: number; isTyping: boolean }) => {
    handleTyping(io, socket, user, payload);
  });
}
