import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { chatbotSessions, chatbotMessages } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const CHATBOT_ESCALATION_QUEUE = `${env.QUEUE_PREFIX}-chatbot-escalation`;

export interface ChatbotEscalationJobData {
  type: "check-escalation" | "escalate-session";
  sessionId?: number;
}

const chatbotEscalationQueue = new Queue<ChatbotEscalationJobData>(CHATBOT_ESCALATION_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addChatbotEscalationJob(
  data: ChatbotEscalationJobData,
  options?: { delay?: number },
): Promise<Job<ChatbotEscalationJobData>> {
  return chatbotEscalationQueue.add("chatbot-escalation", data, options);
}

export async function scheduleChatbotEscalationCheck(intervalMinutes: number = 1): Promise<void> {
  await chatbotEscalationQueue.add(
    "chatbot-escalation",
    { type: "check-escalation" },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      jobId: "chatbot-escalation-recurring",
    },
  );
}

export function createChatbotEscalationWorker(): Worker {
  return new Worker(
    CHATBOT_ESCALATION_QUEUE,
    async (job: Job<ChatbotEscalationJobData>) => {
      const { type, sessionId } = job.data;

      switch (type) {
        case "check-escalation":
          await checkEscalationNeeded();
          break;
        case "escalate-session":
          if (sessionId) await escalateSession(sessionId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );
}

async function checkEscalationNeeded(): Promise<void> {
  console.log("[Chatbot-Escalation] Checking for sessions needing escalation");

  const activeSessions = await db.query.chatbotSessions.findMany({
    where: and(eq(chatbotSessions.status, "active"), isNull(chatbotSessions.escalatedAt)),
    with: {
      config: true,
      messages: {
        orderBy: [desc(chatbotMessages.createdAt)],
        limit: 1,
      },
    },
  });

  for (const session of activeSessions) {
    const lastMessage = session.messages[0];
    if (!lastMessage || lastMessage.authorType !== "user") continue;

    const messageAge = Date.now() - lastMessage.createdAt.getTime();
    const maxDelay = (session.config?.responseDelaySeconds || 5) * 1000;

    if (messageAge > maxDelay) {
      console.log(`[Chatbot-Escalation] Session ${session.id} needs escalation`);
      await escalateSession(session.id);
    }
  }

  await checkConfidenceThresholdEscalation();
}

async function checkConfidenceThresholdEscalation(): Promise<void> {
  console.log("[Chatbot-Escalation] Checking confidence threshold escalation");

  const lowConfidenceSessions = await db.query.chatbotSessions.findMany({
    where: and(eq(chatbotSessions.status, "active"), isNull(chatbotSessions.escalatedAt)),
    with: {
      config: true,
      messages: {
        where: eq(chatbotMessages.authorType, "bot"),
        orderBy: [desc(chatbotMessages.createdAt)],
        limit: 5,
      },
    },
  });

  for (const session of lowConfidenceSessions) {
    if (!session.config) continue;

    const threshold = (session.config.escalationThreshold || 3) * 10;
    let lowConfidenceCount = 0;

    for (const msg of session.messages) {
      const confidence = msg.confidence || 0;
      if (confidence < threshold) {
        lowConfidenceCount++;
      }
    }

    if (lowConfidenceCount >= session.config.escalationThreshold) {
      console.log(`[Chatbot-Escalation] Session ${session.id} triggered threshold escalation`);
      await escalateSession(session.id);
    }
  }
}

async function escalateSession(sessionId: number): Promise<void> {
  console.log(`[Chatbot-Escalation] Escalating session ${sessionId}`);

  const session = await db.query.chatbotSessions.findFirst({
    where: eq(chatbotSessions.id, sessionId),
    with: {
      config: true,
      messages: {
        orderBy: [desc(chatbotMessages.createdAt)],
      },
    },
  });

  if (!session || session.escalatedAt) {
    console.log(`[Chatbot-Escalation] Session ${sessionId} already escalated or not found`);
    return;
  }

  await db
    .update(chatbotSessions)
    .set({
      status: "escalated",
      escalatedAt: new Date(),
    })
    .where(eq(chatbotSessions.id, sessionId));

  const conversationHistory = await getChatbotSessionHistory(sessionId);

  console.log(`[Chatbot-Escalation] Session ${sessionId} escalated. Conversation history:`);
  for (const turn of conversationHistory) {
    console.log(`  User: ${turn.user.substring(0, 50)}...`);
    console.log(`  Bot: ${turn.bot.substring(0, 50)}...`);
  }

  console.log(`[Chatbot-Escalation] Escalation complete for session ${sessionId}`);
}

async function getChatbotSessionHistory(
  sessionId: number,
): Promise<{ user: string; bot: string }[]> {
  const messages = await db.query.chatbotMessages.findMany({
    where: eq(chatbotMessages.chatbotSessionId, sessionId),
    orderBy: [chatbotMessages.createdAt],
  });

  const history: { user: string; bot: string }[] = [];
  let currentUser: string | null = null;
  let currentBot: string | null = null;

  for (const msg of messages) {
    if (msg.authorType === "user") {
      if (currentUser !== null && currentBot !== null) {
        history.push({ user: currentUser, bot: currentBot });
      }
      currentUser = msg.message;
      currentBot = null;
    } else {
      currentBot = msg.message;
    }
  }

  if (currentUser !== null && currentBot !== null) {
    history.push({ user: currentUser, bot: currentBot });
  }

  return history;
}

export async function closeChatbotEscalationQueue(): Promise<void> {
  await chatbotEscalationQueue.close();
}

export { Worker, Job, Queue };
