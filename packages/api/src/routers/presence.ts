import {
  joinTicket,
  leaveTicket,
  heartbeat,
  getTicketViewers,
  isViewingTicket,
} from "../lib/presence";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";

export const presenceRouter = {
  join: protectedProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        userId: z.coerce.number(),
        userName: z.string(),
        avatarUrl: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Presence write permission required");
      }

      await joinTicket(input.ticketId, input.userId, input.userName, input.avatarUrl);
      return { success: true };
    }),

  leave: protectedProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Presence write permission required");
      }

      await leaveTicket(input.ticketId, input.userId);
      return { success: true };
    }),

  ping: protectedProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Presence write permission required");
      }

      const alive = await heartbeat(input.ticketId, input.userId);
      return { alive };
    }),

  list: protectedProcedure
    .input(z.object({ ticketId: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Presence read permission required");
      }

      return await getTicketViewers(input.ticketId);
    }),

  check: protectedProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Presence read permission required");
      }

      const viewing = await isViewingTicket(input.ticketId, input.userId);
      return { viewing };
    }),
};
