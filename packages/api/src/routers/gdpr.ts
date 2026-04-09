import { db } from "@ticket-app/db";
import { gdprRequests } from "@ticket-app/db/schema";
import { eq, desc, and } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const gdprRouter = {
  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        type: z.enum(["access", "erasure", "portability"]),
        contactId: z.number(),
        requestedBy: z.number(),
        reason: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [request] = await db
        .insert(gdprRequests)
        .values({
          organizationId: input.organizationId,
          type: input.type,
          status: "pending",
          contactId: input.contactId,
          requestedBy: input.requestedBy,
          reason: input.reason,
        })
        .returning();
      return request;
    }),

  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        type: z.enum(["access", "erasure", "portability"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(gdprRequests.organizationId, input.organizationId)];

      if (input.status) conditions.push(eq(gdprRequests.status, input.status));
      if (input.type) conditions.push(eq(gdprRequests.type, input.type));

      return await db.query.gdprRequests.findMany({
        where: and(...conditions),
        orderBy: [desc(gdprRequests.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    return await db.query.gdprRequests.findFirst({
      where: eq(gdprRequests.id, input.id),
    });
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        notes: z.string().optional(),
        processedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const updates: Record<string, unknown> = {};

      if (input.status) updates.status = input.status;
      if (input.notes) updates.notes = input.notes;
      if (input.processedBy) updates.processedBy = input.processedBy;

      if (input.status === "completed") {
        updates.completedAt = new Date();
      }

      const [updated] = await db
        .update(gdprRequests)
        .set(updates)
        .where(eq(gdprRequests.id, input.id))
        .returning();

      return updated;
    }),

  processAccessRequest: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const request = await db.query.gdprRequests.findFirst({
        where: eq(gdprRequests.id, input.id),
        with: { contact: true },
      });

      if (!request || request.type !== "access") {
        throw new Error("Invalid access request");
      }

      const contactData = {
        id: request.contact?.id,
        firstName: request.contact?.firstName,
        lastName: request.contact?.lastName,
        email: request.contact?.email,
        phone: request.contact?.phone,
        createdAt: request.contact?.createdAt,
      };

      const dataJson = JSON.stringify(contactData, null, 2);

      await db
        .update(gdprRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
          dataJson,
        })
        .where(eq(gdprRequests.id, input.id));

      return { dataJson };
    }),

  processErasureRequest: publicProcedure
    .input(
      z.object({
        id: z.number(),
        anonymizeData: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      const request = await db.query.gdprRequests.findFirst({
        where: eq(gdprRequests.id, input.id),
        with: { contact: true },
      });

      if (!request || request.type !== "erasure") {
        throw new Error("Invalid erasure request");
      }

      if (input.anonymizeData && request.contact) {
        await db
          .update(request.contact)
          .set({
            firstName: "REDACTED",
            lastName: "REDACTED",
            email: `erased-${request.contact.id}@anonymized.local`,
            phone: null,
            metadata: { erasedAt: new Date().toISOString(), reason: "GDPR Erasure Request" },
          })
          .where(eq(request.contact.id, request.contactId!));
      }

      await db
        .update(gdprRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(gdprRequests.id, input.id));

      return { success: true };
    }),

  processPortabilityRequest: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const request = await db.query.gdprRequests.findFirst({
        where: eq(gdprRequests.id, input.id),
        with: { contact: true },
      });

      if (!request || request.type !== "portability") {
        throw new Error("Invalid portability request");
      }

      const contactData = {
        contact: request.contact,
        exportedAt: new Date().toISOString(),
        format: "JSON",
      };

      const dataJson = JSON.stringify(contactData, null, 2);

      await db
        .update(gdprRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
          dataJson,
        })
        .where(eq(gdprRequests.id, input.id));

      return { dataJson };
    }),
};
