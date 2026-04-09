import { db } from "@ticket-app/db";
import { paymentMethods, stripeCustomers } from "@ticket-app/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const paymentMethodsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.paymentMethods.findMany({
        where: and(
          eq(paymentMethods.organizationId, input.organizationId),
          eq(paymentMethods.isActive, true),
        ),
        orderBy: [desc(paymentMethods.isDefault), desc(paymentMethods.createdAt)],
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.id, input.id),
          eq(paymentMethods.organizationId, input.organizationId),
        ),
      });
    }),

  addStripe: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        stripePaymentMethodId: z.string(),
        setAsDefault: z.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      let customer = await db.query.stripeCustomers.findFirst({
        where: eq(stripeCustomers.organizationId, input.organizationId),
      });

      if (!customer) {
        await db.query.organizations.findFirst({
          where: eq(sql`id = ${input.organizationId}`),
        });
        throw new Error("Stripe customer not found. Please contact support.");
      }

      const [method] = await db
        .insert(paymentMethods)
        .values({
          organizationId: input.organizationId,
          gateway: "stripe",
          type: "card",
          gatewayToken: input.stripePaymentMethodId,
          isDefault: input.setAsDefault,
        })
        .returning();

      if (input.setAsDefault) {
        await db
          .update(paymentMethods)
          .set({ isDefault: false })
          .where(
            and(
              eq(paymentMethods.organizationId, input.organizationId),
              eq(paymentMethods.id, method.id),
            ),
          );
      }

      return await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, method.id),
      });
    }),

  addPaytabs: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        token: z.string(),
        type: z.enum(["mada", "sadad", "applepay", "creditcard"]),
        last4: z.string().optional(),
        brand: z.string().optional(),
        setAsDefault: z.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      const [method] = await db
        .insert(paymentMethods)
        .values({
          organizationId: input.organizationId,
          gateway: "paytabs",
          type: input.type,
          gatewayToken: input.token,
          last4: input.last4,
          brand: input.brand,
          isDefault: input.setAsDefault,
        })
        .returning();

      if (input.setAsDefault) {
        await db
          .update(paymentMethods)
          .set({ isDefault: false })
          .where(
            and(
              eq(paymentMethods.organizationId, input.organizationId),
              eq(paymentMethods.id, method.id),
            ),
          );
      }

      return method;
    }),

  remove: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(paymentMethods)
        .set({
          isActive: false,
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentMethods.id, input.id),
            eq(paymentMethods.organizationId, input.organizationId),
          ),
        )
        .returning();

      return updated;
    }),

  setDefault: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.organizationId, input.organizationId));

      const [updated] = await db
        .update(paymentMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(paymentMethods.id, input.id),
            eq(paymentMethods.organizationId, input.organizationId),
          ),
        )
        .returning();

      return updated;
    }),

  getDefault: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.organizationId, input.organizationId),
          eq(paymentMethods.isDefault, true),
          eq(paymentMethods.isActive, true),
        ),
      });
    }),
};
