import { db } from "@ticket-app/db";
import { forms, formFields } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { convertFormToTicket } from "../services/form";

export const formsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        isPublished: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(forms.organizationId, input.organizationId),
        isNull(forms.deletedAt),
      ];

      if (input.isPublished !== undefined) {
        conditions.push(eq(forms.isPublished, input.isPublished));
      }

      return await db.query.forms.findMany({
        where: and(...conditions),
        orderBy: [desc(forms.createdAt)],
        with: {
          fields: {
            orderBy: (formFields, { asc }) => [asc(formFields.orderBy)],
            where: eq(formFields.isActive, true),
          },
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.organizationId, input.organizationId),
          isNull(forms.deletedAt)
        ),
        with: {
          fields: {
            orderBy: (formFields, { asc }) => [asc(formFields.orderBy)],
            where: eq(formFields.isActive, true),
          },
        },
      });
    }),

  getBySlug: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        slug: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.forms.findFirst({
        where: and(
          eq(forms.organizationId, input.organizationId),
          isNull(forms.deletedAt),
          eq(forms.isPublished, true)
        ),
        with: {
          fields: {
            orderBy: (formFields, { asc }) => [asc(formFields.orderBy)],
            where: eq(formFields.isActive, true),
          },
        },
      });
    }),

  submit: publicProcedure
    .input(
      z.object({
        formId: z.number(),
        organizationId: z.number(),
        fields: z.record(z.string(), z.string()),
        email: z.string().email().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const result = await convertFormToTicket({
        formId: input.formId,
        organizationId: input.organizationId,
        fields: input.fields,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      return {
        success: true,
        ticketId: result.ticket.id,
        referenceNumber: result.ticket.referenceNumber,
      };
    }),
};
