import { db } from "@ticket-app/db";
import { agentCalendarConnections, ticketCalendarEvents } from "@ticket-app/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as z from "zod";

import { env } from "@ticket-app/env/server";
import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { encryptToken, decryptToken } from "../lib/crypto";

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/google/callback";

export const calendarRouter = {
  listConnections: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Calendar read permission required");
      }

      const connections = await db.query.agentCalendarConnections.findMany({
        where: and(
          eq(agentCalendarConnections.userId, input.userId),
          isNull(agentCalendarConnections.deletedAt),
        ),
        orderBy: [desc(agentCalendarConnections.createdAt)],
      });

      return connections.map((conn) => ({
        ...conn,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      }));
    }),

  getConnection: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Calendar read permission required");
      }

      const connection = await db.query.agentCalendarConnections.findFirst({
        where: and(
          eq(agentCalendarConnections.id, input.id),
          eq(agentCalendarConnections.userId, input.userId),
          isNull(agentCalendarConnections.deletedAt),
        ),
      });

      if (!connection) return null;

      return {
        ...connection,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  getGoogleAuthUrl: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Calendar write permission required");
      }

      const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ];

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
      });

      return {
        authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      };
    }),

  connectGoogle: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        organizationId: z.coerce.number(),
        code: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Calendar write permission required");
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: input.code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Google OAuth error: ${tokenResponse.status}`);
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const calendarResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      let primaryCalendar = { id: "primary", summary: "Primary Calendar" };
      if (calendarResponse.ok) {
        const calendarData = (await calendarResponse.json()) as {
          items?: Array<{ id: string; summary: string }>;
        };
        primaryCalendar =
          calendarData.items?.find((c) => c.id === "primary") ||
          calendarData.items?.[0] ||
          primaryCalendar;
      }

      const accessTokenEnc = encryptToken(tokens.access_token);
      const refreshTokenEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

      const existingConnection = await db.query.agentCalendarConnections.findFirst({
        where: and(
          eq(agentCalendarConnections.userId, input.userId),
          eq(agentCalendarConnections.provider, "google"),
          isNull(agentCalendarConnections.deletedAt),
        ),
      });

      if (existingConnection) {
        const [updated] = await db
          .update(agentCalendarConnections)
          .set({
            accessTokenEnc,
            refreshTokenEnc,
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            calendarId: primaryCalendar.id,
            calendarName: primaryCalendar.summary,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(agentCalendarConnections.id, existingConnection.id))
          .returning();

        return {
          ...updated,
          accessTokenEnc: undefined,
          refreshTokenEnc: undefined,
        };
      }

      const [connection] = await db
        .insert(agentCalendarConnections)
        .values({
          userId: input.userId,
          provider: "google",
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          calendarId: primaryCalendar.id,
          calendarName: primaryCalendar.summary,
          isActive: true,
        })
        .returning();

      return {
        ...connection,
        accessTokenEnc: undefined,
        refreshTokenEnc: undefined,
      };
    }),

  disconnect: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Calendar write permission required");
      }

      await db
        .update(agentCalendarConnections)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentCalendarConnections.id, input.id),
            eq(agentCalendarConnections.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  createCalendarEvent: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        ticketId: z.coerce.number(),
        agentCalendarConnectionId: z.coerce.number(),
        title: z.string(),
        description: z.string().optional(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        location: z.string().optional(),
        attendees: z.array(z.string()).optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Calendar write permission required");
      }

      const connection = await db.query.agentCalendarConnections.findFirst({
        where: and(
          eq(agentCalendarConnections.id, input.agentCalendarConnectionId),
          eq(agentCalendarConnections.isActive, true),
          isNull(agentCalendarConnections.deletedAt),
        ),
      });

      if (!connection) {
        throw new Error("Calendar connection not found or inactive");
      }

      let providerEventId: string;

      if (connection.provider === "google") {
        const accessToken = decryptToken(connection.accessTokenEnc);

        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) <= new Date()) {
          if (!connection.refreshTokenEnc) {
            throw new Error("Token expired and no refresh token available");
          }
          const refreshToken = decryptToken(connection.refreshTokenEnc);
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              refresh_token: refreshToken,
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              grant_type: "refresh_token",
            }),
          });

          if (!tokenResponse.ok) {
            throw new Error("Failed to refresh Google token");
          }

          const tokens = (await tokenResponse.json()) as {
            access_token: string;
            expires_in: number;
          };

          await db
            .update(agentCalendarConnections)
            .set({
              accessTokenEnc: encryptToken(tokens.access_token),
              tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
              updatedAt: new Date(),
            })
            .where(eq(agentCalendarConnections.id, connection.id));
        }

        const eventData = {
          summary: input.title,
          description: input.description,
          location: input.location,
          start: { dateTime: input.startAt, timeZone: "UTC" },
          end: { dateTime: input.endAt, timeZone: "UTC" },
          attendees: input.attendees?.map((email) => ({ email })),
        };

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventData),
          },
        );

        if (!calendarResponse.ok) {
          const error = await calendarResponse.text();
          throw new Error(`Google Calendar API error: ${calendarResponse.status} - ${error}`);
        }

        const event = (await calendarResponse.json()) as { id: string };
        providerEventId = event.id;
      } else {
        throw new Error(`Unsupported calendar provider: ${connection.provider}`);
      }

      const [calendarEvent] = await db
        .insert(ticketCalendarEvents)
        .values({
          ticketId: input.ticketId,
          agentCalendarConnectionId: input.agentCalendarConnectionId,
          provider: connection.provider,
          providerEventId,
          title: input.title,
          description: input.description,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          location: input.location,
          attendees: input.attendees?.join(","),
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      return calendarEvent;
    }),

  listCalendarEvents: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        ticketId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Calendar read permission required");
      }

      const events = await db.query.ticketCalendarEvents.findMany({
        where: eq(ticketCalendarEvents.ticketId, input.ticketId),
        orderBy: [desc(ticketCalendarEvents.startAt)],
      });

      return events;
    }),

  listAgentEvents: protectedProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        organizationId: z.coerce.number(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Calendar read permission required");
      }

      const connection = await db.query.agentCalendarConnections.findFirst({
        where: and(
          eq(agentCalendarConnections.userId, input.userId),
          eq(agentCalendarConnections.isActive, true),
          isNull(agentCalendarConnections.deletedAt),
        ),
      });

      if (!connection) {
        return [];
      }

      if (connection.provider === "google") {
        const accessToken = decryptToken(connection.accessTokenEnc);
        const params = new URLSearchParams({
          calendarId: connection.calendarId || "primary",
          timeMin: input.startDate || new Date().toISOString(),
          timeMax: input.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events?${params}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!response.ok) {
          console.error("Google Calendar API error:", response.status);
          return [];
        }

        const data = (await response.json()) as {
          items: Array<{
            id: string;
            summary: string;
            description?: string;
            start: { dateTime?: string; date?: string };
            end: { dateTime?: string; date?: string };
            location?: string;
          }>;
        };

        return data.items.map((event) => ({
          providerEventId: event.id,
          title: event.summary || "Untitled",
          description: event.description,
          startAt: event.start.dateTime || event.start.date,
          endAt: event.end.dateTime || event.end.date,
          location: event.location,
        }));
      }

      return [];
    }),

  deleteCalendarEvent: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
        ticketId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Calendar write permission required");
      }

      const event = await db.query.ticketCalendarEvents.findFirst({
        where: and(
          eq(ticketCalendarEvents.id, input.id),
          eq(ticketCalendarEvents.ticketId, input.ticketId),
        ),
      });

      if (!event) {
        throw new Error("Calendar event not found");
      }

      const connection = await db.query.agentCalendarConnections.findFirst({
        where: eq(agentCalendarConnections.id, event.agentCalendarConnectionId),
      });

      if (connection?.provider === "google" && connection.isActive) {
        const accessToken = decryptToken(connection.accessTokenEnc);
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events/${event.providerEventId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
      }

      await db.delete(ticketCalendarEvents).where(eq(ticketCalendarEvents.id, input.id));

      return { success: true };
    }),
};
