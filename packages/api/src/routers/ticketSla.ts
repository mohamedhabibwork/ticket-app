import { eq, and, isNull, isNotNull } from "drizzle-orm";
import * as z from "zod";

import { db } from "@ticket-app/db";
import { ticketSla, slaPolicies } from "@ticket-app/db/schema/_sla";
import { tickets } from "@ticket-app/db/schema/_tickets";
import { publicProcedure } from "../index";
import { calculateSLADueDates, isWithinBusinessHours } from "../services/sla";

export const ticketSlaRouter = {
  getByTicket: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .handler(async ({ input }) => {
      return await db.query.ticketSla.findFirst({
        where: eq(ticketSla.ticketId, input.ticketId),
        with: {
          slaPolicy: {
            with: {
              targets: true,
            },
          },
          ticket: {
            with: {
              priority: true,
              status: true,
            },
          },
        },
      });
    }),

  createForTicket: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
        with: {
          priority: true,
          organization: true,
        },
      });

      if (!ticket) {
        throw new Error("Ticket not found");
      }

      const slaPolicy = await db.query.slaPolicies.findFirst({
        where: and(
          eq(slaPolicies.organizationId, Number(ticket.organizationId)),
          isNull(slaPolicies.deletedAt),
        ),
        with: {
          targets: {
            with: {
              priority: true,
            },
          },
        },
      });

      if (!slaPolicy) {
        return null;
      }

      const target = slaPolicy.targets.find((t) => t.priorityId === ticket.priorityId);

      if (!target) {
        return null;
      }

      const now = new Date();
      const { firstResponseDueAt, resolutionDueAt } = calculateSLADueDates(
        now,
        target.firstResponseMinutes,
        target.resolutionMinutes,
        slaPolicy.businessHoursOnly ? slaPolicy.businessHoursConfig : null,
        slaPolicy.holidays,
      );

      return await db
        .insert(ticketSla)
        .values({
          ticketId: input.ticketId,
          slaPolicyId: slaPolicy.id,
          firstResponseDueAt,
          resolutionDueAt,
          firstResponseBreached: false,
          resolutionBreached: false,
          pausedDurationMinutes: 0,
        })
        .returning();
    }),

  pause: publicProcedure.input(z.object({ ticketId: z.number() })).handler(async ({ input }) => {
    return await db
      .update(ticketSla)
      .set({
        pausedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ticketSla.ticketId, input.ticketId))
      .returning();
  }),

  resume: publicProcedure.input(z.object({ ticketId: z.number() })).handler(async ({ input }) => {
    const sla = await db.query.ticketSla.findFirst({
      where: eq(ticketSla.ticketId, input.ticketId),
      with: {
        slaPolicy: true,
      },
    });

    if (!sla || !sla.pausedAt) {
      return null;
    }

    const pausedDuration = Math.floor((Date.now() - sla.pausedAt.getTime()) / 60000);

    const now = new Date();
    let newFirstResponseDue = sla.firstResponseDueAt;
    let newResolutionDue = sla.resolutionDueAt;

    if (sla.slaPolicy?.businessHoursOnly && sla.slaPolicy.businessHoursConfig) {
      const businessMinutes = isWithinBusinessHours(
        sla.pausedAt,
        now,
        sla.slaPolicy.businessHoursConfig,
        sla.slaPolicy.holidays,
      );
      newFirstResponseDue = new Date(sla.firstResponseDueAt.getTime() + businessMinutes * 60000);
      newResolutionDue = new Date(sla.resolutionDueAt.getTime() + businessMinutes * 60000);
    } else {
      newFirstResponseDue = new Date(sla.firstResponseDueAt.getTime() + pausedDuration * 60000);
      newResolutionDue = new Date(sla.resolutionDueAt.getTime() + pausedDuration * 60000);
    }

    return await db
      .update(ticketSla)
      .set({
        pausedAt: null,
        pausedDurationMinutes: sla.pausedDurationMinutes + pausedDuration,
        firstResponseDueAt: newFirstResponseDue,
        resolutionDueAt: newResolutionDue,
        updatedAt: new Date(),
      })
      .where(eq(ticketSla.ticketId, input.ticketId))
      .returning();
  }),

  markFirstResponseBreached: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .update(ticketSla)
        .set({
          firstResponseBreached: true,
          firstResponseBreachedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ticketSla.ticketId, input.ticketId))
        .returning();
    }),

  markResolutionBreached: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .update(ticketSla)
        .set({
          resolutionBreached: true,
          resolutionBreachedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ticketSla.ticketId, input.ticketId))
        .returning();
    }),

  listBreached: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select({
          ticketSla: ticketSla,
          ticket: tickets,
        })
        .from(ticketSla)
        .innerJoin(tickets, eq(ticketSla.ticketId, tickets.id))
        .where(
          and(
            eq(tickets.organizationId, input.organizationId),
            isNull(tickets.deletedAt),
            isNotNull(ticketSla.firstResponseBreachedAt),
          ),
        );
    }),

  getBreachStatus: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .handler(async ({ input }) => {
      const sla = await db.query.ticketSla.findFirst({
        where: eq(ticketSla.ticketId, input.ticketId),
      });

      if (!sla) {
        return { hasBreached: false, firstResponseBreached: false, resolutionBreached: false };
      }

      const now = new Date();
      const firstResponseBreached =
        !sla.firstResponseBreached && sla.firstResponseDueAt < now && !sla.pausedAt;
      const resolutionBreached =
        !sla.resolutionBreached && sla.resolutionDueAt < now && !sla.pausedAt;

      return {
        hasBreached: firstResponseBreached || resolutionBreached,
        firstResponseBreached: sla.firstResponseBreached || firstResponseBreached,
        resolutionBreached: sla.resolutionBreached || resolutionBreached,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        isPaused: !!sla.pausedAt,
      };
    }),
};
