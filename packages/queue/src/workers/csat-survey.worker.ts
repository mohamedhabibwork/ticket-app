import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, gte, lt, sql } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { csatSurveys, tickets } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { addEmailSendJob, type EmailSendJobData } from "./email-send.worker";

const CSAT_SURVEY_QUEUE = `${env.QUEUE_PREFIX}-csat-survey`;

export interface CsatSurveyJobData {
  type: "send-survey" | "process-response" | "send-reminder" | "expire-survey";
  surveyId?: number;
  ticketId?: number;
}

export interface CsatSurveyConfig {
  delayAfterResolutionHours: number;
  reminderAfterDays: number;
  surveyExpirationDays: number;
  reminderEnabled: boolean;
}

const defaultConfig: CsatSurveyConfig = {
  delayAfterResolutionHours: 1,
  reminderAfterDays: 3,
  surveyExpirationDays: 7,
  reminderEnabled: true,
};

const csatSurveyQueue = new Queue<CsatSurveyJobData>(CSAT_SURVEY_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addCsatSurveyJob(
  data: CsatSurveyJobData,
  options?: { delay?: number },
): Promise<Job<CsatSurveyJobData>> {
  return csatSurveyQueue.add("csat-survey", data, {
    ...options,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function scheduleCsatSurveys(): Promise<void> {
  const resolvedTickets = await db.query.tickets.findMany({
    where: and(
      sql`${tickets.statusId} IN (
        SELECT id FROM lookups WHERE key = 'status' AND (name = 'resolved' OR name = 'closed')
      )`,
      isNull(tickets.deletedAt),
      sql`${tickets.resolvedAt} IS NOT NULL`,
      sql`${tickets.resolvedAt} <= NOW() - INTERVAL '1 hour'`,
    ),
    with: {
      contact: true,
    },
  });

  for (const ticket of resolvedTickets) {
    const existingSurvey = await db.query.csatSurveys.findFirst({
      where: eq(csatSurveys.ticketId, ticket.id),
    });

    if (!existingSurvey) {
      await addCsatSurveyJob({ type: "send-survey", ticketId: ticket.id });
    }
  }

  const pendingSurveys = await db.query.csatSurveys.findMany({
    where: and(isNull(csatSurveys.respondedAt), gte(csatSurveys.expiresAt, new Date())),
    with: {
      ticket: {
        with: { contact: true },
      },
    },
  });

  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() - defaultConfig.reminderAfterDays);

  for (const survey of pendingSurveys) {
    if (defaultConfig.reminderEnabled && survey.sentAt < reminderDate && !survey.respondedAt) {
      await addCsatSurveyJob({ type: "send-reminder", surveyId: survey.id }, { delay: 0 });
    }
  }

  const expiredSurveys = await db.query.csatSurveys.findMany({
    where: and(isNull(csatSurveys.respondedAt), lt(csatSurveys.expiresAt, new Date())),
  });

  for (const survey of expiredSurveys) {
    await addCsatSurveyJob({ type: "expire-survey", surveyId: survey.id });
  }
}

export function createCsatSurveyWorker(): Worker {
  return new Worker(
    CSAT_SURVEY_QUEUE,
    async (job: Job<CsatSurveyJobData>) => {
      const { type, surveyId, ticketId } = job.data;

      switch (type) {
        case "send-survey":
          if (ticketId) await sendSurvey(ticketId);
          break;
        case "send-reminder":
          if (surveyId) await sendReminder(surveyId);
          break;
        case "expire-survey":
          if (surveyId) await expireSurvey(surveyId);
          break;
        case "process-response":
          if (surveyId) await processResponse(surveyId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );
}

async function sendSurvey(ticketId: number): Promise<void> {
  console.log(`[CSAT] Sending survey for ticket ${ticketId}`);

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      contact: true,
      organization: true,
      assignedAgent: true,
    },
  });

  if (!ticket) {
    console.error(`[CSAT] Ticket ${ticketId} not found`);
    return;
  }

  if (!ticket.contact) {
    console.error(`[CSAT] Ticket ${ticketId} has no contact`);
    return;
  }

  const resolvedAt = ticket.resolvedAt || new Date();
  const expiresAt = new Date(resolvedAt);
  expiresAt.setDate(expiresAt.getDate() + defaultConfig.surveyExpirationDays);

  const [survey] = await db
    .insert(csatSurveys)
    .values({
      ticketId: ticket.id,
      sentTo: ticket.contact.email ?? "",
      sentAt: new Date(),
      expiresAt,
    })
    .returning();

  if (!survey) {
    console.error(`[CSAT] Failed to create survey for ticket ${ticketId}`);
    return;
  }

  const surveyUrl = `${env.APP_URL || "http://localhost:3000"}/csat/${survey.uuid}`;
  const subject = `How was your experience with Ticket #${ticket.referenceNumber}?`;

  const emailData: EmailSendJobData = {
    mailboxId: ticket.mailboxId || 1,
    toEmails: [ticket.contact.email ?? ""],
    subject,
    bodyHtml: generateSurveyEmailHtml(ticket, surveyUrl),
    bodyText: generateSurveyEmailText(ticket, surveyUrl),
    ticketId: ticket.id,
    mergeTags: {
      customer_name: ticket.contact.firstName || "Customer",
      ticket_reference: ticket.referenceNumber,
      agent_name: ticket.assignedAgent
        ? `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}`
        : "Support Team",
      survey_url: surveyUrl,
      expiration_date: expiresAt.toLocaleDateString(),
    },
  };

  await addEmailSendJob(emailData);

  console.log(`[CSAT] Survey sent to ${ticket.contact.email} for ticket ${ticketId}`);
}

async function sendReminder(surveyId: number): Promise<void> {
  console.log(`[CSAT] Sending reminder for survey ${surveyId}`);

  const survey = await db.query.csatSurveys.findFirst({
    where: eq(csatSurveys.id, surveyId),
    with: {
      ticket: {
        with: {
          contact: true,
          assignedAgent: true,
        },
      },
    },
  });

  if (!survey) {
    console.error(`[CSAT] Survey ${surveyId} not found`);
    return;
  }

  if (survey.respondedAt) {
    console.log(`[CSAT] Survey ${surveyId} already responded, skipping reminder`);
    return;
  }

  if (new Date() > survey.expiresAt) {
    console.log(`[CSAT] Survey ${surveyId} expired, skipping reminder`);
    return;
  }

  const surveyUrl = `${env.APP_URL || "http://localhost:3000"}/csat/${survey.uuid}`;
  const subject = `Reminder: Rate your experience with Ticket #${survey.ticket.referenceNumber}`;

  const emailData: EmailSendJobData = {
    mailboxId: survey.ticket.mailboxId || 1,
    toEmails: [survey.sentTo],
    subject,
    bodyHtml: generateReminderEmailHtml(survey, surveyUrl),
    bodyText: generateReminderEmailText(survey, surveyUrl),
    ticketId: survey.ticketId,
    mergeTags: {
      customer_name: survey.ticket.contact?.firstName || "Customer",
      ticket_reference: survey.ticket.referenceNumber,
      agent_name: survey.ticket.assignedAgent
        ? `${survey.ticket.assignedAgent.firstName} ${survey.ticket.assignedAgent.lastName}`
        : "Support Team",
      survey_url: surveyUrl,
      expiration_date: survey.expiresAt.toLocaleDateString(),
    },
  };

  await addEmailSendJob(emailData);

  console.log(`[CSAT] Reminder sent to ${survey.sentTo} for survey ${surveyId}`);
}

async function expireSurvey(surveyId: number): Promise<void> {
  console.log(`[CSAT] Expiring survey ${surveyId}`);

  await db.update(csatSurveys).set({}).where(eq(csatSurveys.id, surveyId));

  console.log(`[CSAT] Survey ${surveyId} expired`);
}

async function processResponse(surveyId: number, rating?: number, comment?: string): Promise<void> {
  console.log(`[CSAT] Processing response for survey ${surveyId}`);

  const survey = await db.query.csatSurveys.findFirst({
    where: eq(csatSurveys.id, surveyId),
  });

  if (!survey) {
    console.error(`[CSAT] Survey ${surveyId} not found`);
    return;
  }

  if (survey.respondedAt) {
    console.log(`[CSAT] Survey ${surveyId} already responded`);
    return;
  }

  if (new Date() > survey.expiresAt) {
    console.log(`[CSAT] Survey ${surveyId} expired, cannot accept response`);
    return;
  }

  await db
    .update(csatSurveys)
    .set({
      rating,
      comment,
      respondedAt: new Date(),
    })
    .where(eq(csatSurveys.id, surveyId));

  console.log(`[CSAT] Survey ${surveyId} response recorded: ${rating} stars`);
}

export async function getCsatStats(organizationId: number): Promise<{
  totalResponses: number;
  averageRating: number;
  responseRate: number;
  distribution: Record<number, number>;
}> {
  const surveys = await db.query.csatSurveys.findMany({
    where: and(
      sql`ticket_id IN (
        SELECT id FROM tickets WHERE organization_id = ${organizationId}
      )`,
      isNull(csatSurveys.respondedAt),
    ),
    with: {
      ticket: true,
    },
  });

  const totalSurveys = surveys.length;
  const respondedSurveys = surveys.filter((s) => s.respondedAt !== null);
  const totalResponses = respondedSurveys.length;

  const ratings = respondedSurveys.map((s) => s.rating).filter((r): r is number => r !== null);

  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

  const responseRate = totalSurveys > 0 ? (totalResponses / totalSurveys) * 100 : 0;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) {
    if (rating >= 1 && rating <= 5) {
      distribution[rating] = (distribution[rating] ?? 0) + 1;
    }
  }

  return {
    totalResponses,
    averageRating: Math.round(averageRating * 100) / 100,
    responseRate: Math.round(responseRate * 100) / 100,
    distribution,
  };
}

function generateSurveyEmailHtml(ticket: { referenceNumber: string }, surveyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Customer Satisfaction Survey</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>How was your experience?</h2>
  <p>Thank you for contacting us regarding Ticket #${ticket.referenceNumber}.</p>
  <p>We would love to hear about your experience. Please take a moment to rate your satisfaction:</p>
  <div style="text-align: center; margin: 30px 0;">
    <p style="font-size: 18px;">Click below to rate:</p>
    <a href="${surveyUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Rate Now</a>
  </div>
  <p style="color: #666; font-size: 12px;">This survey will expire in 7 days.</p>
</body>
</html>
  `.trim();
}

function generateSurveyEmailText(ticket: { referenceNumber: string }, surveyUrl: string): string {
  return `
How was your experience?

Thank you for contacting us regarding Ticket #${ticket.referenceNumber}.

We would love to hear about your experience. Please rate your satisfaction by visiting:
${surveyUrl}

This survey will expire in 7 days.
  `.trim();
}

function generateReminderEmailHtml(
  survey: { ticket: { referenceNumber: string } },
  surveyUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reminder: Rate Your Experience</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Reminder: We value your feedback</h2>
  <p>This is a reminder to rate your experience with Ticket #${survey.ticket.referenceNumber}.</p>
  <p>Your feedback helps us improve our service.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${surveyUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">Rate Now</a>
  </div>
  <p style="color: #666; font-size: 12px;">This survey will expire soon.</p>
</body>
</html>
  `.trim();
}

function generateReminderEmailText(
  survey: { ticket: { referenceNumber: string } },
  surveyUrl: string,
): string {
  return `
Reminder: We value your feedback

This is a reminder to rate your experience with Ticket #${survey.ticket.referenceNumber}.

Your feedback helps us improve our service.

Please rate by visiting:
${surveyUrl}

This survey will expire soon.
  `.trim();
}

export async function closeCsatSurveyQueue(): Promise<void> {
  await csatSurveyQueue.close();
}

export { Worker, Job, Queue };
