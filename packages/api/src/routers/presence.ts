import {
  joinTicket,
  leaveTicket,
  heartbeat,
  getTicketViewers,
  isViewingTicket,
} from "../lib/presence";
import * as z from "zod";

import { publicProcedure } from "../index";

export const presenceRouter = {
  join: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        userId: z.number(),
        userName: z.string(),
        avatarUrl: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await joinTicket(input.ticketId, input.userId, input.userName, input.avatarUrl);
      return { success: true };
    }),

  leave: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await leaveTicket(input.ticketId, input.userId);
      return { success: true };
    }),

  ping: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const alive = await heartbeat(input.ticketId, input.userId);
      return { alive };
    }),

  list: publicProcedure.input(z.object({ ticketId: z.number() })).handler(async ({ input }) => {
    return await getTicketViewers(input.ticketId);
  }),

  check: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const viewing = await isViewingTicket(input.ticketId, input.userId);
      return { viewing };
    }),
};
