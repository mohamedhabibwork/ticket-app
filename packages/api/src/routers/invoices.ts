import { db } from "@ticket-app/db";
import { invoices, invoiceItems, payments, subscriptions } from "@ticket-app/db/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const invoicesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .handler(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const [invoicesList, totalResult] = await Promise.all([
        db.query.invoices.findMany({
          where: and(
            eq(invoices.organizationId, input.organizationId),
            isNull(invoices.deletedAt)
          ),
          with: {
            items: true,
            subscription: {
              with: {
                plan: true,
              },
            },
          },
          orderBy: [desc(invoices.createdAt)],
          limit: input.limit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.organizationId, input.organizationId)),
      ]);

      return {
        invoices: invoicesList,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: Number(totalResult[0]?.count || 0),
          totalPages: Math.ceil(
            Number(totalResult[0]?.count || 0) / input.limit
          ),
        },
      };
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.id),
          eq(invoices.organizationId, input.organizationId)
        ),
        with: {
          items: true,
          payments: true,
          subscription: {
            with: {
              plan: true,
            },
          },
        },
      });
    }),

  getByNumber: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        number: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.invoices.findFirst({
        where: and(
          eq(invoices.number, input.number),
          eq(invoices.organizationId, input.organizationId)
        ),
        with: {
          items: true,
          payments: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        subscriptionId: z.number().optional(),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().min(1).default(1),
            unitPrice: z.number(),
          })
        ),
        taxRate: z.number().min(0).default(0),
        dueDate: z.string().or(z.date()),
        periodStart: z.string().or(z.date()),
        periodEnd: z.string().or(z.date()),
        currency: z.string().length(3).default("USD"),
      })
    )
    .handler(async ({ input }) => {
      const year = new Date().getFullYear();

      const lastInvoice = await db.query.invoices.findFirst({
        where: eq(invoices.organizationId, input.organizationId),
        orderBy: [desc(invoices.createdAt)],
      });

      let sequence = 1;
      if (lastInvoice?.number) {
        const lastSeq = parseInt(lastInvoice.number.split("-").pop() || "0");
        sequence = lastSeq + 1;
      }

      const org = await db.query.organizations.findFirst({
        where: eq(sql`id = ${input.organizationId}`),
      });

      const orgSlug = org?.slug || "org";
      const number = `INV-${orgSlug}-${year}-${sequence.toString().padStart(4, "0")}`;

      const subtotal = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const taxAmount = Math.round((subtotal * input.taxRate) / 100);
      const total = subtotal + taxAmount;

      const [invoice] = await db
        .insert(invoices)
        .values({
          organizationId: input.organizationId,
          subscriptionId: input.subscriptionId,
          number,
          status: "draft",
          currency: input.currency,
          subtotal,
          taxAmount,
          taxRate: input.taxRate,
          total,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          dueDate: new Date(input.dueDate),
        })
        .returning();

      if (input.items.length > 0) {
        await db.insert(invoiceItems).values(
          input.items.map((item) => ({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
          }))
        );
      }

      return await db.query.invoices.findFirst({
        where: eq(invoices.id, invoice.id),
        with: {
          items: true,
          subscription: {
            with: {
              plan: true,
            },
          },
        },
      });
    }),

  markAsPaid: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
        paymentId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(invoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  void: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(invoices)
        .set({
          status: "void",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  getInvoiceStats: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const stats = await db
        .select({
          status: invoices.status,
          count: sql<number>`count(*)`,
          total: sql<number>`sum(${invoices.total})`,
        })
        .from(invoices)
        .where(eq(invoices.organizationId, input.organizationId))
        .groupBy(invoices.status);

      const byStatus = stats.reduce(
        (acc, row) => {
          acc[row.status] = {
            count: Number(row.count),
            total: Number(row.total || 0),
          };
          return acc;
        },
        {} as Record<string, { count: number; total: number }>
      );

      return byStatus;
    }),
};
