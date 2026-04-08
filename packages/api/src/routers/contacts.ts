import { db } from "@ticket-app/db";
import { contacts } from "@ticket-app/db/schema";
import { eq, and, ilike, isNull, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const contactsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(contacts.organizationId, input.organizationId),
        isNull(contacts.deletedAt),
      ];

      if (input.search) {
        conditions.push(
          ilike(contacts.email, `%${input.search}%`)
        );
      }

      return await db.query.contacts.findMany({
        where: and(...conditions),
        orderBy: [desc(contacts.createdAt)],
        limit: input.limit,
        offset: input.offset,
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
      return await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, input.id),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt)
        ),
      });
    }),

  getByEmail: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, input.email.toLowerCase()),
          eq(contacts.organizationId, input.organizationId),
          isNull(contacts.deletedAt)
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        contactTypeId: z.number().optional(),
        language: z.string().optional(),
        timezone: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .handler(async ({ input }) => {
      const existingContact = input.email
        ? await db.query.contacts.findFirst({
            where: and(
              eq(contacts.email, input.email.toLowerCase()),
              eq(contacts.organizationId, input.organizationId),
              isNull(contacts.deletedAt)
            ),
          })
        : null;

      if (existingContact) {
        return { duplicate: true, contact: existingContact };
      }

      const [contact] = await db
        .insert(contacts)
        .values({
          organizationId: input.organizationId,
          email: input.email?.toLowerCase(),
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          contactTypeId: input.contactTypeId,
          language: input.language,
          timezone: input.timezone,
          metadata: input.metadata,
        })
        .returning();

      return { duplicate: false, contact };
    }),
};
