import { db } from "@ticket-app/db";
import { ecommerceOrders, ecommerceStores } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql, or } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const ecommerceOrdersRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        storeId: z.number().optional(),
        status: z.string().optional(),
        financialStatus: z.string().optional(),
        fulfillmentStatus: z.string().optional(),
        contactId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const storeIds = input.storeId
        ? [input.storeId]
        : (
            await db.query.ecommerceStores.findMany({
              where: and(
                eq(ecommerceStores.organizationId, input.organizationId),
                isNull(ecommerceStores.deletedAt)
              ),
              columns: { id: true },
            })
          ).map((s) => s.id);

      const conditions = [
        sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
        isNull(ecommerceOrders.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(ecommerceOrders.status, input.status));
      }
      if (input.financialStatus) {
        conditions.push(eq(ecommerceOrders.financialStatus, input.financialStatus));
      }
      if (input.fulfillmentStatus) {
        conditions.push(eq(ecommerceOrders.fulfillmentStatus, input.fulfillmentStatus));
      }
      if (input.contactId) {
        conditions.push(eq(ecommerceOrders.contactId, input.contactId));
      }

      return await db.query.ecommerceOrders.findMany({
        where: and(...conditions),
        orderBy: [desc(ecommerceOrders.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          store: true,
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
      return await db.query.ecommerceOrders.findFirst({
        where: and(
          eq(ecommerceOrders.id, input.id),
          isNull(ecommerceOrders.deletedAt)
        ),
        with: {
          store: true,
        },
      });
    }),

  getByOrderNumber: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        storeId: z.number(),
        orderNumber: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.ecommerceOrders.findFirst({
        where: and(
          eq(ecommerceOrders.storeId, input.storeId),
          eq(ecommerceOrders.orderNumber, input.orderNumber),
          isNull(ecommerceOrders.deletedAt)
        ),
        with: {
          store: true,
        },
      });
    }),

  getByContact: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.ecommerceOrders.findMany({
        where: and(
          eq(ecommerceOrders.contactId, input.contactId),
          isNull(ecommerceOrders.deletedAt)
        ),
        orderBy: [desc(ecommerceOrders.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          store: true,
        },
      });
    }),

  searchByEmail: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .handler(async ({ input }) => {
      const storeIds = (
        await db.query.ecommerceStores.findMany({
          where: and(
            eq(ecommerceStores.organizationId, input.organizationId),
            isNull(ecommerceStores.deletedAt)
          ),
          columns: { id: true },
        })
      ).map((s) => s.id);

      if (storeIds.length === 0) return [];

      return await db.query.ecommerceOrders.findMany({
        where: and(
          sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
          eq(ecommerceOrders.customerEmail, input.email.toLowerCase()),
          isNull(ecommerceOrders.deletedAt)
        ),
        orderBy: [desc(ecommerceOrders.createdAt)],
        limit: input.limit,
        with: {
          store: true,
        },
      });
    }),

  searchByPhone: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        phone: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .handler(async ({ input }) => {
      const storeIds = (
        await db.query.ecommerceStores.findMany({
          where: and(
            eq(ecommerceStores.organizationId, input.organizationId),
            isNull(ecommerceStores.deletedAt)
          ),
          columns: { id: true },
        })
      ).map((s) => s.id);

      if (storeIds.length === 0) return [];

      const normalizedPhone = input.phone.replace(/\D/g, "");

      return await db.query.ecommerceOrders.findMany({
        where: and(
          sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${ecommerceOrders.customerPhone} REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${normalizedPhone}, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '')`,
          isNull(ecommerceOrders.deletedAt)
        ),
        orderBy: [desc(ecommerceOrders.createdAt)],
        limit: input.limit,
        with: {
          store: true,
        },
      });
    }),

  getRecent: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactId: z.number().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .handler(async ({ input }) => {
      const conditions: any[] = [isNull(ecommerceOrders.deletedAt)];

      if (input.contactId) {
        conditions.push(eq(ecommerceOrders.contactId, input.contactId));
      } else if (input.email) {
        conditions.push(eq(ecommerceOrders.customerEmail, input.email.toLowerCase()));
      } else if (input.phone) {
        const normalizedPhone = input.phone.replace(/\D/g, "");
        conditions.push(
          sql`${ecommerceOrders.customerPhone} REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${normalizedPhone}, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '')`
        );
      } else {
        return [];
      }

      return await db.query.ecommerceOrders.findMany({
        where: and(...conditions),
        orderBy: [desc(ecommerceOrders.createdAt)],
        limit: input.limit,
        with: {
          store: true,
        },
      });
    }),
};
