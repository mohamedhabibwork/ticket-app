import { db } from "@ticket-app/db";
import {
  subscriptions,
  subscriptionPlans,
  seats,
  organizations,
  stripeCustomers,
} from "@ticket-app/db/schema";
import { eq, and, sql } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getOrCreateStripeCustomer,
} from "../services/stripe";

export const subscriptionsRouter = {
  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
        with: {
          plan: true,
          seats: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!subscription) {
        return null;
      }

      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, subscription.planId),
        with: {
          planFeatures: true,
          planLimits: true,
        },
      });

      const activeSeats = subscription.seats?.filter((seat) => !seat.removedAt) || [];

      const agentCount = activeSeats.length;
      const maxAgents = plan?.maxAgents || 0;
      const seatLimitReached = maxAgents > 0 && agentCount >= maxAgents;

      return {
        ...subscription,
        plan,
        agentCount,
        maxAgents,
        seatLimitReached,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        planId: z.number(),
        billingCycle: z.enum(["monthly", "annual"]),
        seatCount: z.number().min(1),
        couponCode: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, input.planId),
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const [subscription] = await db
        .insert(subscriptions)
        .values({
          organizationId: input.organizationId,
          planId: input.planId,
          billingCycle: input.billingCycle,
          seatCount: input.seatCount,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning();

      await db
        .update(organizations)
        .set({ planId: input.planId, maxAgents: plan.maxAgents })
        .where(eq(organizations.id, input.organizationId));

      return subscription;
    }),

  update: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        planId: z.number().optional(),
        billingCycle: z.enum(["monthly", "annual"]).optional(),
        seatCount: z.number().min(1).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
      });

      if (!existing) {
        throw new Error("No subscription found");
      }

      const updates: Partial<typeof existing> = {};

      if (input.planId) {
        const newPlan = await db.query.subscriptionPlans.findFirst({
          where: eq(subscriptionPlans.id, input.planId),
        });
        if (newPlan) {
          updates.planId = input.planId;
          await db
            .update(organizations)
            .set({ planId: input.planId, maxAgents: newPlan.maxAgents })
            .where(eq(organizations.id, input.organizationId));
        }
      }

      if (input.billingCycle) {
        updates.billingCycle = input.billingCycle;
      }

      if (input.seatCount !== undefined) {
        updates.seatCount = input.seatCount;
      }

      const [updated] = await db
        .update(subscriptions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(subscriptions.id, existing.id))
        .returning();

      return updated;
    }),

  cancel: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        immediate: z.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
      });

      if (!subscription) {
        throw new Error("No subscription found");
      }

      const canceledAt = new Date();
      const effectiveDate = input.immediate ? canceledAt : subscription.currentPeriodEnd;

      const [updated] = await db
        .update(subscriptions)
        .set({
          canceledAt,
          cancelAtPeriodEnd: !input.immediate,
          status: "canceled",
          updatedAt: canceledAt,
        })
        .where(eq(subscriptions.id, subscription.id))
        .returning();

      return {
        canceledAt,
        effectiveDate,
        subscription: updated,
      };
    }),

  getSeatCount: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const activeSeats = await db
        .select({ count: sql<number>`count(*)` })
        .from(seats)
        .innerJoin(subscriptions, eq(seats.subscriptionId, subscriptions.id))
        .where(
          and(
            eq(subscriptions.organizationId, input.organizationId),
            sql`${seats.removedAt} IS NULL`,
          ),
        );

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
        with: {
          plan: true,
        },
      });

      return {
        activeSeats: Number(activeSeats[0]?.count || 0),
        seatLimit: subscription?.plan?.maxAgents || 0,
        seatCount: subscription?.seatCount || 0,
      };
    }),

  addSeat: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
        with: {
          plan: true,
          seats: true,
        },
      });

      if (!subscription) {
        throw new Error("No subscription found");
      }

      const activeSeats = subscription.seats?.filter((seat) => !seat.removedAt) || [];
      const maxAgents = subscription.plan?.maxAgents || 0;

      if (maxAgents > 0 && activeSeats.length >= maxAgents) {
        throw new Error("Seat limit reached. Please upgrade your plan.");
      }

      const existingSeat = subscription.seats?.find(
        (s) => s.userId === input.userId && !s.removedAt,
      );

      if (existingSeat) {
        throw new Error("User is already a seat");
      }

      const [seat] = await db
        .insert(seats)
        .values({
          subscriptionId: subscription.id,
          userId: input.userId,
          role: "agent",
          addedAt: new Date(),
        })
        .returning();

      return seat;
    }),

  removeSeat: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
        with: {
          seats: true,
        },
      });

      if (!subscription) {
        throw new Error("No subscription found");
      }

      const seat = subscription.seats?.find((s) => s.userId === input.userId && !s.removedAt);

      if (!seat) {
        throw new Error("Seat not found");
      }

      const [updated] = await db
        .update(seats)
        .set({ removedAt: new Date() })
        .where(eq(seats.id, seat.id))
        .returning();

      return updated;
    }),

  getAvailablePlans: publicProcedure.handler(async () => {
    return await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      with: {
        planFeatures: true,
        planLimits: true,
      },
      orderBy: [subscriptionPlans.priceMonthly],
    });
  }),

  createBillingPortalSession: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        returnUrl: z.string().url(),
      }),
    )
    .handler(async ({ input }) => {
      const customer = await db.query.stripeCustomers.findFirst({
        where: eq(stripeCustomers.organizationId, input.organizationId),
      });

      if (!customer) {
        throw new Error("No Stripe customer found. Please contact support.");
      }

      const sessionUrl = await createBillingPortalSession(customer.customerId, input.returnUrl);

      return { url: sessionUrl };
    }),

  createCheckout: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        planId: z.number(),
        seatCount: z.number().min(1),
        billingCycle: z.enum(["monthly", "annual"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }),
    )
    .handler(async ({ input }) => {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, input.planId),
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      let customer = await db.query.stripeCustomers.findFirst({
        where: eq(stripeCustomers.organizationId, input.organizationId),
      });

      if (!customer) {
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, input.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        const _customerId = await getOrCreateStripeCustomer(
          input.organizationId,
          org.email || "unknown@unknown.com",
          org.name,
        );

        customer = await db.query.stripeCustomers.findFirst({
          where: eq(stripeCustomers.organizationId, input.organizationId),
        });
      }

      const priceId =
        input.billingCycle === "monthly"
          ? plan.stripePriceIdMonthly || ""
          : plan.stripePriceIdYearly || "";

      if (!priceId) {
        throw new Error(`No Stripe price configured for ${input.billingCycle} billing`);
      }

      const sessionUrl = await createCheckoutSession({
        organizationId: input.organizationId,
        priceId,
        seatCount: input.seatCount,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });

      return { url: sessionUrl };
    }),
};
