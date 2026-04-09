import { db } from "@ticket-app/db";
import { chatbotConfigs, chatbotSessions, chatbotMessages, kbArticles } from "@ticket-app/db/schema";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { embedText } from "./ai";
import { users } from "@ticket-app/db/schema";

export interface ChatbotConfig {
  id: number;
  organizationId: number;
  name: string;
  isEnabled: boolean;
  escalationThreshold: number;
  responseDelaySeconds: number;
  workingHours?: Record<string, unknown>;
}

export interface ChatbotMessage {
  id: number;
  chatbotSessionId: number;
  authorType: "user" | "bot";
  message: string;
  intent?: string;
  confidence?: number;
  kbArticleId?: number;
  createdAt: Date;
}

export interface SemanticSearchResult {
  articleId: number;
  title: string;
  bodyText: string;
  similarity: number;
}

export interface ChatbotResponse {
  message: string;
  confidence: number;
  kbArticleId?: number;
  intent?: string;
}

const DEFAULT_ESCALATION_THRESHOLD = 0.7;
const DEFAULT_RESPONSE_DELAY = 300;

export async function getChatbotConfig(organizationId: number): Promise<ChatbotConfig | null> {
  const config = await db.query.chatbotConfigs.findFirst({
    where: and(
      eq(chatbotConfigs.organizationId, organizationId),
      eq(chatbotConfigs.isEnabled, true)
    ),
  });

  return config || null;
}

export async function generateKBEmbeddings(articleId: number): Promise<number[]> {
  const article = await db.query.kbArticles.findFirst({
    where: eq(kbArticles.id, articleId),
  });

  if (!article) {
    throw new Error(`Article ${articleId} not found`);
  }

  const textToEmbed = `${article.title}\n\n${article.bodyText || ""}`.substring(0, 5000);
  const embedding = await embedText(textToEmbed);

  return embedding;
}

export async function semanticSearchKB(
  organizationId: number,
  query: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await embedText(query.substring(0, 5000));

  const articles = await db.query.kbArticles.findMany({
    where: and(
      eq(kbArticles.organizationId, organizationId),
      eq(kbArticles.status, "published"),
      isNull(kbArticles.deletedAt)
    ),
    limit: 20,
  });

  const results: SemanticSearchResult[] = [];

  for (const article of articles) {
    const articleEmbedding = await generateKBEmbeddings(article.id);
    const similarity = cosineSimilarity(queryEmbedding, articleEmbedding);

    results.push({
      articleId: article.id,
      title: article.title,
      bodyText: article.bodyText || "",
      similarity,
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export async function processChatbotMessage(
  sessionId: number,
  message: string
): Promise<ChatbotResponse> {
  const session = await db.query.chatbotSessions.findFirst({
    where: eq(chatbotSessions.id, sessionId),
    with: {
      config: true,
    },
  });

  if (!session || !session.config) {
    throw new Error("Chatbot session or config not found");
  }

  await db.insert(chatbotMessages).values({
    chatbotSessionId: sessionId,
    authorType: "user",
    message,
  });

  const threshold = session.config.escalationThreshold || DEFAULT_ESCALATION_THRESHOLD;
  const searchResults = await semanticSearchKB(
    session.config.organizationId,
    message,
    3
  );

  let response: ChatbotResponse;

  if (searchResults.length > 0 && searchResults[0].similarity >= threshold) {
    const bestMatch = searchResults[0];
    response = {
      message: bestMatch.bodyText.substring(0, 500),
      confidence: searchResults[0].similarity,
      kbArticleId: bestMatch.articleId,
      intent: "kb_lookup",
    };
  } else {
    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotMessages)
      .where(eq(chatbotMessages.chatbotSessionId, sessionId));

    const userMessageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotMessages)
      .where(
        and(
          eq(chatbotMessages.chatbotSessionId, sessionId),
          eq(chatbotMessages.authorType, "user")
        )
      );

    if (userMessageCount[0].count >= 3) {
      response = {
        message: session.config.escalationMessage || "I'll connect you with a human agent.",
        confidence: 1.0,
        intent: "escalate",
      };
    } else {
      response = {
        message: "I'm not sure I understand. Could you rephrase your question?",
        confidence: 0.3,
        intent: "clarification",
      };
    }
  }

  await db.insert(chatbotMessages).values({
    chatbotSessionId: sessionId,
    authorType: "bot",
    message: response.message,
    confidence: Math.round(response.confidence * 100),
    kbArticleId: response.kbArticleId,
    intent: response.intent,
  });

  await db
    .update(chatbotSessions)
    .set({
      messagesCount: (session.messagesCount || 0) + 2,
    })
    .where(eq(chatbotSessions.id, sessionId));

  return response;
}

export async function escalateChatbotSession(sessionId: number, agentId?: number): Promise<void> {
  await db
    .update(chatbotSessions)
    .set({
      escalatedAt: new Date(),
      status: "escalated",
      escalatedToAgentId: agentId,
    })
    .where(eq(chatbotSessions.id, sessionId));
}

export async function getChatbotSessionHistory(
  sessionId: number
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

export async function getChatbotAnalytics(
  organizationId: number,
  days: number = 30
): Promise<{
  totalSessions: number;
  escalatedSessions: number;
  resolvedSessions: number;
  averageMessagesPerSession: number;
  escalationRate: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await db.query.chatbotSessions.findMany({
    where: and(
      eq(chatbotSessions.contactId, sql`contact_id`),
      gte(chatbotSessions.createdAt, startDate)
    ),
  });

  const totalSessions = sessions.length;
  const escalatedSessions = sessions.filter((s) => s.escalatedAt !== null).length;
  const resolvedSessions = sessions.filter((s) => s.resolvedAt !== null).length;

  const totalMessages = sessions.reduce((sum, s) => sum + (s.messagesCount || 0), 0);
  const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;
  const escalationRate = totalSessions > 0 ? escalatedSessions / totalSessions : 0;

  return {
    totalSessions,
    escalatedSessions,
    resolvedSessions,
    averageMessagesPerSession,
    escalationRate,
  };
}
