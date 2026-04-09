import { db } from "@ticket-app/db";
import { tickets, users, ticketMessages, lookups, organizations } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql, gte, lte, count, avg } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const reportsRouter = {
  getTicketVolume: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      const ticketList = await db.query.tickets.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          createdAt: true,
          statusId: true,
          channelId: true,
        },
      });

      const total = ticketList.length;

      const byStatus = await db
        .select({
          statusId: tickets.statusId,
          statusName: lookups.name,
          count: count(),
        })
        .from(tickets)
        .leftJoin(lookups, eq(tickets.statusId, lookups.id))
        .where(and(...conditions))
        .groupBy(tickets.statusId, lookups.name);

      const byChannel = await db
        .select({
          channelId: tickets.channelId,
          channelName: lookups.name,
          count: count(),
        })
        .from(tickets)
        .leftJoin(lookups, eq(tickets.channelId, lookups.id))
        .where(and(...conditions))
        .groupBy(tickets.channelId, lookups.name);

      return {
        total,
        byStatus,
        byChannel,
      };
    }),

  getAgentPerformance: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
        isNull(tickets.assignedAgentId),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      const agentStats = await db
        .select({
          agentId: tickets.assignedAgentId,
          agentName: users.firstName,
          agentEmail: users.email,
          totalTickets: count(),
        })
        .from(tickets)
        .leftJoin(users, eq(tickets.assignedAgentId, users.id))
        .where(and(...conditions))
        .groupBy(tickets.assignedAgentId, users.firstName, users.email);

      const resolvedStats = await db
        .select({
          agentId: tickets.assignedAgentId,
          resolvedCount: count(),
        })
        .from(tickets)
        .leftJoin(lookups, eq(tickets.statusId, lookups.id))
        .where(
          and(
            eq(tickets.organizationId, input.organizationId),
            isNull(tickets.deletedAt),
            sql`${lookups.metadata}->>'resolved' = 'true'`,
          ),
        )
        .groupBy(tickets.assignedAgentId);

      return agentStats.map((agent) => {
        const resolved = resolvedStats.find((r) => r.agentId === agent.agentId);
        return {
          ...agent,
          resolvedTickets: resolved?.resolvedCount || 0,
          resolutionRate: agent.totalTickets > 0 ? (resolved?.resolvedCount || 0) / agent.totalTickets : 0,
        };
      });
    }),

  getSlaCompliance: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      const ticketList = await db.query.tickets.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          firstResponseAt: true,
          dueAt: true,
          resolvedAt: true,
        },
        with: {
          sla: true,
        },
      });

      const total = ticketList.length;
      const withinSla = ticketList.filter((t) => {
        if (!t.firstResponseAt || !t.dueAt) return true;
        return t.firstResponseAt <= t.dueAt;
      }).length;

      return {
        total,
        withinSla,
        breachedSla: total - withinSla,
        complianceRate: total > 0 ? withinSla / total : 0,
      };
    }),

  getCsatTrends: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        interval: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      return await db.query.tickets.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          createdAt: true,
        },
        with: {
          sla: true,
        },
      });
    }),

  getResponseTime: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      const ticketList = await db.query.tickets.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          createdAt: true,
          firstResponseAt: true,
          assignedAgentId: true,
        },
      });

      const ticketsWithResponse = ticketList.filter((t) => t.firstResponseAt);
      const responseTimes = ticketsWithResponse.map((t) => {
        const diff = t.firstResponseAt!.getTime() - t.createdAt.getTime();
        return diff / 1000 / 60;
      });

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      return {
        totalTickets: ticketList.length,
        ticketsWithResponse: ticketsWithResponse.length,
        averageResponseTimeMinutes: avgResponseTime,
        averageResponseTimeHours: avgResponseTime / 60,
      };
    }),

  getResolutionRate: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      const ticketList = await db.query.tickets.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          resolvedAt: true,
          closedAt: true,
        },
      });

      const resolved = ticketList.filter((t) => t.resolvedAt || t.closedAt);

      return {
        total: ticketList.length,
        resolved: resolved.length,
        resolutionRate: ticketList.length > 0 ? resolved.length / ticketList.length : 0,
      };
    }),

  exportReport: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        reportType: z.enum(["ticket_volume", "agent_performance", "sla_compliance", "csat"]),
        format: z.enum(["csv", "pdf"]).default("csv"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return {
        success: true,
        message: `Report export triggered for ${input.reportType} in ${input.format} format`,
      };
    }),

  getCustomReport: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return {
        id: input.id,
        name: "Custom Report",
        config: {},
      };
    }),

  createCustomReport: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(255),
        config: z.object({
          metrics: z.array(z.string()),
          groupBy: z.string().optional(),
          filters: z.record(z.any()).optional(),
        }),
      }),
    )
    .handler(async ({ input }) => {
      return {
        id: Date.now(),
        name: input.name,
        config: input.config,
        createdAt: new Date(),
      };
    }),
};
