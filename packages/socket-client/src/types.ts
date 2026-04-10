import type { ManagerOptions, SocketOptions } from "socket.io-client";

export interface ViewerPresence {
  ticketId: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface NotificationPayload {
  id: string;
  userId: number;
  type: string;
  title: string;
  body: string;
  ticketId?: number;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  uuid?: string;
  sessionId: number;
  authorType: "agent" | "contact" | "system";
  authorId?: number;
  authorName?: string;
  body: string;
  attachments?: unknown[];
  createdAt: string;
  read?: boolean;
}

export interface TicketUpdatePayload {
  ticketId: number;
  userId: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

export interface TicketCreatePayload {
  ticketId: number;
  referenceNumber: string;
  subject: string;
  statusId: number;
  priorityId: number;
  createdBy: number;
  createdAt: string;
}

export interface TicketAssignedPayload {
  ticketId: number;
  assignedAgentId?: number;
  assignedTeamId?: number;
  assignedBy: number;
  assignedAt: string;
}

export interface TicketStatusChangePayload {
  ticketId: number;
  statusId: number;
  changedBy: number;
  changedAt: string;
}

export interface TicketMessagePayload {
  ticketId: number;
  messageId: number;
  authorType: "agent" | "contact" | "system";
  authorId?: number;
  body: string;
  messageType: "reply" | "note" | "activity";
  isPrivate: boolean;
  createdAt: string;
}

export interface TypingPayload {
  sessionId: number;
  agentTyping: boolean;
  contactTyping: boolean;
}

export interface JoinSessionAck {
  sessionId: number;
  success: boolean;
}

export interface LeaveSessionAck {
  sessionId: number;
  success: boolean;
}

export interface HeartbeatAck {
  ticketId: number;
  active: boolean;
}

export interface MarkReadAck {
  notificationId: string;
  success: boolean;
}

export interface MarkAllReadAck {
  success: boolean;
}

export interface ViewersList {
  ticketId: number;
  viewers: ViewerPresence[];
}

export interface ErrorPayload {
  message: string;
}

export type ServerToClientEvents = {
  viewer_joined: (data: ViewerPresence) => void;
  viewer_left: (data: { ticketId: number; userId: number }) => void;
  heartbeat_ack: (data: HeartbeatAck) => void;
  viewers_list: (data: ViewersList) => void;
  notification: (data: NotificationPayload) => void;
  mark_read_ack: (data: MarkReadAck) => void;
  mark_all_read_ack: (data: MarkAllReadAck) => void;
  join_session_ack: (data: JoinSessionAck) => void;
  leave_session_ack: (data: LeaveSessionAck) => void;
  message: (data: ChatMessage) => void;
  typing: (data: TypingPayload) => void;
  leave: (data: { sessionId: number; isAgent: boolean }) => void;
  ticket_created: (data: TicketCreatePayload) => void;
  ticket_updated: (data: TicketUpdatePayload) => void;
  ticket_assigned: (data: TicketAssignedPayload) => void;
  ticket_status_changed: (data: TicketStatusChangePayload) => void;
  ticket_message_added: (data: TicketMessagePayload) => void;
  error: (data: ErrorPayload) => void;
};

export type ClientToServerEvents = {
  join_ticket: (data: { ticketId: number; userName: string; avatarUrl?: string }) => void;
  leave_ticket: (data: { ticketId: number }) => void;
  heartbeat: (data: { ticketId: number }) => void;
  get_viewers: (data: { ticketId: number }) => void;
  mark_read: (data: { notificationId: string }) => void;
  mark_all_read: () => void;
  join_session: (data: { sessionId: number; isAgent: boolean }) => void;
  leave_session: (data: { sessionId: number }) => void;
  send_message: (data: { sessionId: number; body: string; attachments?: unknown[] }) => void;
  typing: (data: { sessionId: number; isTyping: boolean }) => void;
};

export interface SocketInitOptions {
  url?: string;
  token: string;
  userId: number;
  organizationId: number;
}

export type { ManagerOptions, SocketOptions };
