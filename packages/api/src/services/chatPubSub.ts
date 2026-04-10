import { getRedis } from "../lib/redis";

const SOCKET_EVENTS_CHANNEL = "socket:events";

export interface ChatPubSubMessage {
  event: string;
  sessionId: number;
  data: unknown;
}

async function publishChatEvent(message: ChatPubSubMessage): Promise<void> {
  const redis = getRedis();
  await redis.publish(SOCKET_EVENTS_CHANNEL, JSON.stringify(message));
}

export interface TypingIndicatorParams {
  sessionId: number;
  userId?: number;
  contactId?: number;
  isTyping: boolean;
}

export async function publishTypingIndicator(params: TypingIndicatorParams): Promise<void> {
  await publishChatEvent({
    event: "chat:typing",
    sessionId: params.sessionId,
    data: {
      userId: params.userId,
      contactId: params.contactId,
      isTyping: params.isTyping,
    },
  });
}

export interface ReadReceiptParams {
  sessionId: number;
  messageId: number;
  userId?: number;
  contactId?: number;
}

export async function publishReadReceipt(params: ReadReceiptParams): Promise<void> {
  await publishChatEvent({
    event: "chat:read_receipt",
    sessionId: params.sessionId,
    data: {
      messageId: params.messageId,
      userId: params.userId,
      contactId: params.contactId,
      readAt: new Date().toISOString(),
    },
  });
}

export interface ChatMessageParams {
  sessionId: number;
  message: {
    id: number;
    body: string;
    authorType: string;
    createdAt: Date;
    [key: string]: unknown;
  };
}

export async function publishChatMessage(params: ChatMessageParams): Promise<void> {
  await publishChatEvent({
    event: "chat:message",
    sessionId: params.sessionId,
    data: params.message,
  });
}
