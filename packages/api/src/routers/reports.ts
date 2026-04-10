import { db } from "@ticket-app/db";
import { tickets, users, lookups, teams } from "@ticket-app/db/schema";
import { csatSurveys } from "@ticket-app/db/schema/_sla";
import { eq, and, isNull, sql, gte, lte, count, inArray } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const reportsRouter = {
  getTicketVolume: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
        groupId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      if (input.groupId) {
        const teamIdsResult = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.groupId, input.groupId));
        const teamIds = teamIdsResult.map((t) => t.id);
        if (teamIds.length > 0) {
          conditions.push(inArray(tickets.assignedTeamId, teamIds));
        } else {
          conditions.push(eq(tickets.assignedTeamId, -1));
        }
      }

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
        organizationId: z.coerce.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        groupId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) conditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(tickets.createdAt, input.endDate));

      if (input.groupId) {
        const teamIdsResult = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.groupId, input.groupId));
        const teamIds = teamIdsResult.map((t) => t.id);
        if (teamIds.length > 0) {
          conditions.push(inArray(tickets.assignedTeamId, teamIds));
        } else {
          conditions.push(eq(tickets.assignedTeamId, -1));
        }
      }

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
          resolutionRate:
            agent.totalTickets > 0 ? (resolved?.resolvedCount || 0) / agent.totalTickets : 0,
        };
      });
    }),

  getSlaCompliance: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
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
        organizationId: z.coerce.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        interval: z.enum(["day", "week", "month"]).default("day"),
      }),
    )
    .handler(async ({ input }) => {
      const ticketConditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.startDate) ticketConditions.push(gte(tickets.createdAt, input.startDate));
      if (input.endDate) ticketConditions.push(lte(tickets.createdAt, input.endDate));

      const surveysWithTickets = await db
        .select({
          rating: csatSurveys.rating,
          respondedAt: csatSurveys.respondedAt,
          sentAt: csatSurveys.sentAt,
          ticketId: csatSurveys.ticketId,
        })
        .from(csatSurveys)
        .innerJoin(tickets, eq(csatSurveys.ticketId, tickets.id))
        .where(and(...ticketConditions));

      const totalSurveys = surveysWithTickets.length;
      const respondedSurveys = surveysWithTickets.filter((s) => s.respondedAt !== null);
      const totalRating = respondedSurveys.reduce((sum, s) => sum + (s.rating || 0), 0);

      const intervalMs =
        input.interval === "day" ? 86400000 : input.interval === "week" ? 604800000 : 2592000000;
      const intervalBuckets: Record<string, { count: number; totalRating: number }> = {};

      for (const survey of respondedSurveys) {
        if (survey.respondedAt) {
          const bucketKey = new Date(
            Math.floor(survey.respondedAt.getTime() / intervalMs) * intervalMs,
          ).toISOString();
          if (!intervalBuckets[bucketKey]) {
            intervalBuckets[bucketKey] = { count: 0, totalRating: 0 };
          }
          intervalBuckets[bucketKey].count++;
          intervalBuckets[bucketKey].totalRating += survey.rating || 0;
        }
      }

      const byInterval = Object.entries(intervalBuckets)
        .map(([period, data]) => ({
          period,
          responses: data.count,
          averageRating: data.totalRating / data.count,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        totalSurveys,
        respondedSurveys: respondedSurveys.length,
        responseRate: totalSurveys > 0 ? respondedSurveys.length / totalSurveys : 0,
        averageRating: respondedSurveys.length > 0 ? totalRating / respondedSurveys.length : 0,
        byInterval,
      };
    }),

  getResponseTime: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
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

      const avgResponseTime =
        responseTimes.length > 0
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
        organizationId: z.coerce.number(),
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
        organizationId: z.coerce.number(),
        reportType: z.enum(["ticket_volume", "agent_performance", "sla_compliance", "csat"]),
        format: z.enum(["csv", "pdf"]).default("csv"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const reportData = await generateReportData(input);

      if (input.format === "csv") {
        const csv = generateCsv(reportData, input.reportType);
        return {
          success: true,
          format: "csv",
          contentType: "text/csv",
          filename: `${input.reportType}_report_${new Date().toISOString().split("T")[0]}.csv`,
          data: csv,
        };
      } else {
        return {
          success: true,
          format: "pdf",
          contentType: "application/pdf",
          filename: `${input.reportType}_report_${new Date().toISOString().split("T")[0]}.pdf`,
          data: null,
          message: "PDF generation not yet implemented",
        };
      }
    }),

  getCustomReport: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
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
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(255),
        config: z.object({
          metrics: z.array(z.string()),
          groupBy: z.string().optional(),
          filters: z.record(z.string(), z.unknown()).optional(),
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

interface ReportData {
  headers: string[];
  rows: Record<string, unknown>[];
  title: string;
}

async function generateReportData(input: {
  organizationId: number;
  reportType: "ticket_volume" | "agent_performance" | "sla_compliance" | "csat";
  startDate?: Date;
  endDate?: Date;
}): Promise<ReportData> {
  const { organizationId, reportType, startDate, endDate } = input;

  switch (reportType) {
    case "ticket_volume": {
      const ticketList = await db.query.tickets.findMany({
        where: and(
          eq(tickets.organizationId, organizationId),
          isNull(tickets.deletedAt),
          startDate ? gte(tickets.createdAt, startDate) : undefined,
          endDate ? lte(tickets.createdAt, endDate) : undefined,
        ),
        columns: { id: true, createdAt: true, statusId: true, channelId: true },
      });

      const total = ticketList.length;
      const byStatus = await db
        .select({ statusName: lookups.name, count: count() })
        .from(tickets)
        .leftJoin(lookups, eq(tickets.statusId, lookups.id))
        .where(and(eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)))
        .groupBy(tickets.statusId, lookups.name);

      const byChannel = await db
        .select({ channelName: lookups.name, count: count() })
        .from(tickets)
        .leftJoin(lookups, eq(tickets.channelId, lookups.id))
        .where(and(eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)))
        .groupBy(tickets.channelId, lookups.name);

      return {
        title: "Ticket Volume Report",
        headers: ["Metric", "Value"],
        rows: [
          { metric: "Total Tickets", value: total },
          ...byStatus.map((s) => ({
            metric: `Status: ${s.statusName || "Unknown"}`,
            value: s.count,
          })),
          ...byChannel.map((c) => ({
            metric: `Channel: ${c.channelName || "Unknown"}`,
            value: c.count,
          })),
        ],
      };
    }

    case "agent_performance": {
      const agentStats = await db
        .select({
          agentId: tickets.assignedAgentId,
          agentName: users.firstName,
          agentEmail: users.email,
          totalTickets: count(),
        })
        .from(tickets)
        .leftJoin(users, eq(tickets.assignedAgentId, users.id))
        .where(and(eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)))
        .groupBy(tickets.assignedAgentId, users.firstName, users.email);

      return {
        title: "Agent Performance Report",
        headers: ["Agent Name", "Email", "Total Tickets"],
        rows: agentStats.map((a) => ({
          "Agent Name": a.agentName || "Unassigned",
          Email: a.agentEmail || "N/A",
          "Total Tickets": a.totalTickets,
        })),
      };
    }

    case "sla_compliance": {
      const ticketList = await db.query.tickets.findMany({
        where: and(eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)),
        columns: { id: true, firstResponseAt: true, dueAt: true },
      });

      const total = ticketList.length;
      const withinSla = ticketList.filter((t) => {
        if (!t.firstResponseAt || !t.dueAt) return true;
        return t.firstResponseAt <= t.dueAt;
      }).length;

      return {
        title: "SLA Compliance Report",
        headers: ["Metric", "Value"],
        rows: [
          { metric: "Total Tickets", value: total },
          { metric: "Within SLA", value: withinSla },
          { metric: "Breached SLA", value: total - withinSla },
          {
            metric: "Compliance Rate",
            value: total > 0 ? `${((withinSla / total) * 100).toFixed(2)}%` : "N/A",
          },
        ],
      };
    }

    case "csat": {
      const surveysWithTickets = await db
        .select({ rating: csatSurveys.rating, respondedAt: csatSurveys.respondedAt })
        .from(csatSurveys)
        .innerJoin(tickets, eq(csatSurveys.ticketId, tickets.id))
        .where(and(eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)));

      const totalSurveys = surveysWithTickets.length;
      const respondedSurveys = surveysWithTickets.filter((s) => s.respondedAt !== null);
      const totalRating = respondedSurveys.reduce((sum, s) => sum + (s.rating || 0), 0);

      return {
        title: "Customer Satisfaction Report",
        headers: ["Metric", "Value"],
        rows: [
          { metric: "Total Surveys Sent", value: totalSurveys },
          { metric: "Responses Received", value: respondedSurveys.length },
          {
            metric: "Response Rate",
            value:
              totalSurveys > 0
                ? `${((respondedSurveys.length / totalSurveys) * 100).toFixed(2)}%`
                : "N/A",
          },
          {
            metric: "Average Rating",
            value:
              respondedSurveys.length > 0
                ? (totalRating / respondedSurveys.length).toFixed(2)
                : "N/A",
          },
        ],
      };
    }

    default:
      return { title: "Report", headers: [], rows: [] };
  }
}

function generateCsv(data: ReportData, _reportType: string): string {
  const lines: string[] = [];

  lines.push(`"${data.title}"`);
  lines.push(`"Generated: ${new Date().toISOString()}"`);
  lines.push("");

  lines.push(data.headers.map((h) => `"${h}"`).join(","));

  for (const row of data.rows) {
    const values = data.headers.map((header) => {
      const value = row[header.toLowerCase().replace(/ /g, "_")] ?? row[header] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}
