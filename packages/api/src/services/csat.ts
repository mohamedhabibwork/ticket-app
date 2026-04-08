import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { csatSurveys } from "@ticket-app/db/schema/_sla";
import { tickets } from "@ticket-app/db/schema/_tickets";
import { addEmailJob } from "@ticket-app/db/lib/queues";

export async function createCsatSurvey(
  ticketId: number,
  contactEmail: string
): Promise<typeof csatSurveys.$inferSelect | null> {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      contact: true,
      organization: true,
    },
  });

  if (!ticket || !ticket.resolvedAt) {
    return null;
  }

  const expiresAt = new Date(ticket.resolvedAt);
  expiresAt.setDate(expiresAt.getDate() + 7);

  const survey = await db
    .insert(csatSurveys)
    .values({
      ticketId,
      sentTo: contactEmail,
      sentAt: new Date(),
      expiresAt,
    })
    .returning();

  return survey[0] || null;
}

export async function sendCsatSurveyEmail(
  survey: typeof csatSurveys.$inferSelect,
  ticket: typeof tickets.$inferSelect
): Promise<void> {
  const surveyUrl = `${process.env.APP_URL}/survey/${survey.uuid}`;

  await addEmailJob({
    to: survey.sentTo,
    subject: `How was your experience with ticket ${ticket.referenceNumber}?`,
    body: `
      <h1>We'd love your feedback!</h1>
      <p>Your ticket ${ticket.referenceNumber} has been resolved. Please take a moment to rate your experience.</p>
      <p>Click below to rate your satisfaction:</p>
      <div style="margin: 20px 0;">
        <a href="${surveyUrl}?rating=5" style="padding: 10px 20px; margin: 5px; background: #22c55e; color: white; text-decoration: none;">5 - Excellent</a>
        <a href="${surveyUrl}?rating=4" style="padding: 10px 20px; margin: 5px; background: #84cc16; color: white; text-decoration: none;">4 - Good</a>
        <a href="${surveyUrl}?rating=3" style="padding: 10px 20px; margin: 5px; background: #eab308; color: white; text-decoration: none;">3 - Average</a>
        <a href="${surveyUrl}?rating=2" style="padding: 10px 20px; margin: 5px; background: #f97316; color: white; text-decoration: none;">2 - Poor</a>
        <a href="${surveyUrl}?rating=1" style="padding: 10px 20px; margin: 5px; background: #ef4444; color: white; text-decoration: none;">1 - Very Poor</a>
      </div>
      <p>Or visit: <a href="${surveyUrl}">${surveyUrl}</a></p>
      <p>This survey expires on ${survey.expiresAt.toLocaleDateString()}.</p>
    `,
  });
}

export async function submitCsatResponse(
  surveyUuid: string,
  rating: number,
  comment?: string
): Promise<typeof csatSurveys.$inferSelect | null> {
  const survey = await db.query.csatSurveys.findFirst({
    where: eq(csatSurveys.uuid, surveyUuid),
  });

  if (!survey || survey.respondedAt) {
    return null;
  }

  if (new Date() > survey.expiresAt) {
    return null;
  }

  const result = await db
    .update(csatSurveys)
    .set({
      rating,
      comment,
      respondedAt: new Date(),
    })
    .where(eq(csatSurveys.uuid, surveyUuid))
    .returning();

  return result[0] || null;
}

export async function getCsatStats(organizationId: number): Promise<{
  totalResponses: number;
  averageRating: number;
  responseRate: number;
}> {
  const allSurveys = await db.query.csatSurveys.findMany({
    with: {
      ticket: true,
    },
  });

  const orgSurveys = allSurveys.filter(
    (s) => s.ticket?.organizationId === organizationId
  );

  const responded = orgSurveys.filter((s) => s.respondedAt);
  const totalResponses = responded.length;
  const averageRating =
    totalResponses > 0
      ? responded.reduce((sum, s) => sum + (s.rating || 0), 0) / totalResponses
      : 0;
  const responseRate = orgSurveys.length > 0 ? totalResponses / orgSurveys.length : 0;

  return {
    totalResponses,
    averageRating: Math.round(averageRating * 10) / 10,
    responseRate: Math.round(responseRate * 100),
  };
}
