import { Queue, Worker, Job } from "bullmq";
import { eq, lt, and, isNull } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { csatSurveys } from "@ticket-app/db/schema/_sla";
import { addNotificationJob } from "@ticket-app/db/lib/queues";

export const CSAT_EXPIRATION_QUEUE = "csat:expiration";

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
};

export type CsatExpirationJobData = {
  surveyId?: number;
};

export const csatExpirationQueue = new Queue<CsatExpirationJobData>(CSAT_EXPIRATION_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

interface CsatSurveyWithOrg {
  id: number;
  ticketId: number;
  sentTo: string;
  sentAt: Date;
  expiresAt: Date;
  rating: number | null;
  comment: string | null;
  respondedAt: Date | null;
  uuid: string;
  ticket?: {
    organizationId: number;
    referenceNumber: string;
  };
}

export async function expireCsatSurvey(survey: CsatSurveyWithOrg): Promise<void> {
  if (survey.respondedAt) {
    return;
  }

  await db.update(csatSurveys).set({}).where(eq(csatSurveys.id, survey.id));
}

export async function getExpiredSurveys(): Promise<CsatSurveyWithOrg[]> {
  const now = new Date();

  const expiredSurveys = await db.query.csatSurveys.findMany({
    where: and(lt(csatSurveys.expiresAt, now), isNull(csatSurveys.respondedAt)),
    with: {
      ticket: {
        with: {
          organization: true,
        },
      },
    },
  });

  return expiredSurveys as CsatSurveyWithOrg[];
}

export async function generateCsatExpirationReport(): Promise<{
  expiredCount: number;
  totalPending: number;
  responseRate: number;
  averageRating: number;
}> {
  const allSurveys = await db.query.csatSurveys.findMany();

  const pendingSurveys = allSurveys.filter((s) => !s.respondedAt);
  const respondedSurveys = allSurveys.filter((s) => s.respondedAt);

  const totalPending = pendingSurveys.length;
  const expiredCount = pendingSurveys.filter((s) => new Date(s.expiresAt) < new Date()).length;

  const responseRate =
    allSurveys.length > 0 ? (respondedSurveys.length / allSurveys.length) * 100 : 0;

  const ratings = respondedSurveys.filter((s) => s.rating !== null).map((s) => s.rating as number);

  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

  return {
    expiredCount,
    totalPending,
    responseRate: Math.round(responseRate * 100) / 100,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

export async function notifyOrgAboutExpiredSurvey(survey: CsatSurveyWithOrg): Promise<void> {
  if (!survey.ticket?.organizationId) return;

  await addNotificationJob({
    userId: `org-${survey.ticket.organizationId}`,
    type: "csat_expired",
    title: "CSAT Survey Expired",
    message: `CSAT survey for ticket ${survey.ticket.referenceNumber} has expired without a response.`,
    metadata: {
      surveyId: survey.id,
      ticketId: survey.ticketId,
      organizationId: survey.ticket.organizationId,
    },
  });
}

export function createCsatExpirationWorker() {
  return new Worker<CsatExpirationJobData>(
    CSAT_EXPIRATION_QUEUE,
    async (job) => {
      const { surveyId } = job.data;

      if (surveyId) {
        const survey = await db.query.csatSurveys.findFirst({
          where: eq(csatSurveys.id, surveyId),
          with: {
            ticket: true,
          },
        });

        if (survey) {
          await expireCsatSurvey(survey as CsatSurveyWithOrg);
        }
      } else {
        const expiredSurveys = await getExpiredSurveys();

        for (const survey of expiredSurveys) {
          await expireCsatSurvey(survey);
          await notifyOrgAboutExpiredSurvey(survey);
        }

        const report = await generateCsatExpirationReport();
        console.log("[CSAT Expiration Report]", report);
      }
    },
    {
      connection,
      concurrency: 3,
    },
  );
}

export async function scheduleCsatExpirationCheck(): Promise<void> {
  await csatExpirationQueue.add(
    "csat_expiration",
    {},
    {
      jobId: `csat-expiration-${Date.now()}`,
      repeat: {
        pattern: "0 0 * * *",
      },
    },
  );
}

export { Job };
