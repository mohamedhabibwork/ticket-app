import { eq } from "drizzle-orm";
import * as z from "zod";

import { db } from "@ticket-app/db";
import { csatSurveys } from "@ticket-app/db/schema/_sla";
import { tickets } from "@ticket-app/db/schema/_tickets";
import { publicProcedure } from "../index";
import {
  createCsatSurvey,
  sendCsatSurveyEmail,
  submitCsatResponse,
  getCsatStats,
} from "../services/csat";

export const csatSurveysRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      const allSurveys = await db.query.csatSurveys.findMany({
        with: {
          ticket: true,
        },
      });

      return allSurveys.filter((s) => s.ticket?.organizationId === input.organizationId);
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    return await db.query.csatSurveys.findFirst({
      where: eq(csatSurveys.id, input.id),
      with: {
        ticket: {
          with: {
            contact: true,
          },
        },
      },
    });
  }),

  getByUuid: publicProcedure.input(z.object({ uuid: z.string() })).handler(async ({ input }) => {
    return await db.query.csatSurveys.findFirst({
      where: eq(csatSurveys.uuid, input.uuid),
      with: {
        ticket: true,
      },
    });
  }),

  create: publicProcedure
    .input(z.object({ ticketId: z.number(), contactEmail: z.string() }))
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      const survey = await createCsatSurvey(input.ticketId, input.contactEmail);

      if (survey) {
        await sendCsatSurveyEmail(survey, ticket);
      }

      return survey;
    }),

  submit: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return await submitCsatResponse(input.uuid, input.rating, input.comment);
    }),

  getStats: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await getCsatStats(input.organizationId);
    }),

  resend: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const survey = await db.query.csatSurveys.findFirst({
      where: eq(csatSurveys.id, input.id),
      with: {
        ticket: true,
      },
    });

    if (!survey || !survey.ticket) {
      throw new Error("Survey not found");
    }

    await sendCsatSurveyEmail(survey, survey.ticket);

    return survey;
  }),
};
