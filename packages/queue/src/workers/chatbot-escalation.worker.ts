import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { chatbotConfigs, chatbotSessions, chatbotMessages } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const CHATBOT_ESCALATION_QUEUE = `${env.QUEUE_PREFIX}:chatbot-escalation`;

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
  options?: { delay?: number }
): Promise<Job<ChatbotEscalationJobData>> {
  return chatbotEscalationQueue.add("chatbot-escalation", data, options);
}

export async function scheduleChatbotEscalationCheck(
  intervalMinutes: number = 1
): Promise<void> {
  await chatbotEscalationQueue.add(
    "chatbot-escalation",
    { type: "check-escalation" },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      jobId: "chatbot-escalation-recurring",
    }
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
    }
  );
}

async function checkEscalationNeeded(): Promise<void> {
  console.log("[Chatbot-Escalation] Checking for sessions needing escalation");

  const activeSessions = await db.query.chatbotSessions.findMany({
    where: and(
      isNull(chatbotSessions.endedAt),
      isNull(chatbotSessions.escalatedToAgentId)
    ),
    with: {
      config: true,
      messages: {
        orderBy: (chatbotMessages, { desc }) => [desc(chatbotMessages.createdAt)],
        limit: 1,
      },
    },
  });

  for (const session of activeSessions) {
    const lastMessage = session.messages[0];
    if (!lastMessage || lastMessage.authorType !== "user") continue;

    const messageAge = Date.now() - lastMessage.createdAt.getTime();
    const maxDelay = (session.config?.maxEscalationDelay || 300) * 1000;

    if (messageAge > maxDelay) {
      console.log(`[Chatbot-Escalation] Session ${session.id} needs escalation`);
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
    },
  });

  if (!session || session.escalatedToAgentId) {
    return;
  }

  await db
    .update(chatbotSessions)
    .set({
      escalatedToAgentId: session.config?.agentId || null,
      endedAt: new Date(),
      endReason: "escalated",
    })
    .where(eq(chatbotSessions.id, sessionId));
}

export async function closeChatbotEscalationQueue(): Promise<void> {
  await chatbotEscalationQueue.close();
}

export { Worker, Job, Queue };
