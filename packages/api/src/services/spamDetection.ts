import { Worker, Job } from "bullmq";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { tickets, ticketMessages } from "@ticket-app/db/schema/_tickets";
import { emailMessages } from "@ticket-app/db/schema/_mailboxes";
import { addSpamCheckJob, spamCheckQueue, type SpamCheckJobData } from "@ticket-app/db/lib/queues";

const SPAM_DOMAINS = [
  "mail.ru",
  "yandex.ru",
  "rambler.ru",
  "hotmail.com",
  "outlook.com",
  "gmx.de",
  "web.de",
];

const SPAM_KEYWORDS = [
  "buy now",
  "click here",
  "free money",
  "make money fast",
  "act now",
  "limited time offer",
  "congratulations you won",
  "nigerian prince",
  "wire transfer",
  "cryptocurrency giveaway",
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i,
  /tinyurl\.com/i,
  /t\.co/i,
  /goo\.gl/i,
  /ow\.ly/i,
  /is\.gd/i,
  /buff\.ly/i,
  /ad\.fly/i,
  /bit\.do/i,
];

export interface SpamCheckResult {
  isSpam: boolean;
  spamScore: number;
  reasons: string[];
}

export async function checkSpamScore(ticketId: number): Promise<SpamCheckResult> {
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)),
    with: {
      contact: true,
      messages: {
        orderBy: [desc(ticketMessages.createdAt)],
        limit: 1,
      },
    },
  });

  if (!ticket) {
    return { isSpam: false, spamScore: 0, reasons: [] };
  }

  let spamScore = 0;
  const reasons: string[] = [];

  const contact = ticket.contact as { email: string | null } | null;
  if (contact?.email) {
    const emailLower = contact.email.toLowerCase();
    const domain = emailLower.split("@")[1] || "";

    if (SPAM_DOMAINS.some((d) => domain.includes(d))) {
      spamScore += 30;
      reasons.push(`Known spam domain: ${domain}`);
    }

    const freeEmailProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];
    if (freeEmailProviders.some((p) => domain.includes(p))) {
      spamScore += 5;
      reasons.push("Free email provider used");
    }
  }

  const contentToCheck = [
    ticket.subject,
    ticket.descriptionHtml || "",
    ...ticket.messages.map((m) => m.bodyHtml || ""),
    ...ticket.messages.map((m) => m.bodyText || ""),
  ]
    .join(" ")
    .toLowerCase();

  const capsRatio = (ticket.subject.match(/[A-Z]/g) || []).length / ticket.subject.length;
  if (capsRatio > 0.5 && ticket.subject.length > 10) {
    spamScore += 20;
    reasons.push("Excessive caps in subject");
  }

  for (const keyword of SPAM_KEYWORDS) {
    if (contentToCheck.includes(keyword)) {
      spamScore += 15;
      reasons.push(`Spam keyword detected: ${keyword}`);
    }
  }

  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(contentToCheck)) {
      spamScore += 10;
      reasons.push("Suspicious URL pattern detected");
      break;
    }
  }

  const linkMatches = contentToCheck.match(/https?:\/\/[^\s]+/g) || [];
  if (linkMatches.length > 5) {
    spamScore += 15;
    reasons.push(`Too many links: ${linkMatches.length}`);
  }

  const exclaimCount = (contentToCheck.match(/!/g) || []).length;
  if (exclaimCount > 5) {
    spamScore += 10;
    reasons.push("Excessive exclamation marks");
  }

  const dollarCount = (contentToCheck.match(/\$/g) || []).length;
  if (dollarCount > 3) {
    spamScore += 10;
    reasons.push("Multiple dollar signs detected");
  }

  return {
    isSpam: spamScore >= 50,
    spamScore,
    reasons,
  };
}

export async function detectSpam(ticketId: number): Promise<SpamCheckResult> {
  let spamScore = 0;
  const reasons: string[] = [];

  const emailMessage = await db.query.emailMessages.findFirst({
    where: eq(emailMessages.ticketId, ticketId),
    with: {
      mailbox: true,
    },
  });

  if (emailMessage) {
    if (emailMessage.spamScore) {
      const externalScore = parseFloat(emailMessage.spamScore);
      if (!isNaN(externalScore)) {
        spamScore = externalScore * 50;
        reasons.push(`SpamAssassin score: ${externalScore}`);
      }
    }

    if (emailMessage.isSpam) {
      spamScore += 50;
      reasons.push("Marked as spam by email gateway");
    }
  }

  const contentResult = await checkSpamScore(ticketId);
  spamScore += contentResult.spamScore;
  reasons.push(...contentResult.reasons);

  const finalIsSpam = spamScore >= 50;

  await db
    .update(tickets)
    .set({
      isSpam: finalIsSpam,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));

  return {
    isSpam: finalIsSpam,
    spamScore,
    reasons,
  };
}

export async function markAsSpam(ticketId: number): Promise<void> {
  await db
    .update(tickets)
    .set({
      isSpam: true,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));
}

export async function markAsNotSpam(ticketId: number): Promise<void> {
  await db
    .update(tickets)
    .set({
      isSpam: false,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));
}

export async function getSpamTickets(organizationId: number, limit = 50, offset = 0) {
  return await db.query.tickets.findMany({
    where: and(
      eq(tickets.organizationId, organizationId),
      eq(tickets.isSpam, true),
      isNull(tickets.deletedAt),
    ),
    orderBy: [desc(tickets.createdAt)],
    limit,
    offset,
    with: {
      contact: true,
      status: true,
      priority: true,
      channel: true,
      assignedAgent: true,
    },
  });
}

export async function enqueueSpamCheck(ticketId: number): Promise<void> {
  await addSpamCheckJob({ ticketId });
}

export async function executeSpamCheck(job: Job<SpamCheckJobData>): Promise<void> {
  const { ticketId } = job.data;
  await detectSpam(ticketId);
}

export function createSpamCheckWorker() {
  return new Worker<SpamCheckJobData>("spam:check", executeSpamCheck, {
    connection: {
      host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
      port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
    },
    concurrency: 5,
  });
}

export { spamCheckQueue };
export type { SpamCheckJobData };
export { Worker, Job };
