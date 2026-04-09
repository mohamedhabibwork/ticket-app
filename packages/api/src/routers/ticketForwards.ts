import { randomBytes } from "crypto";

import { db } from "@ticket-app/db";
import { ticketForwards, tickets, emailMessages } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { addEmailSendJob } from "../jobs/emailSend";

export const ticketForwardsRouter = {
  create: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        messageId: z.number().optional(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().optional(),
        body: z.string(),
        forwardedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
        with: { mailbox: true },
      });

      if (!ticket?.mailboxId) {
        throw new Error("Ticket has no associated mailbox");
      }

      const [forward] = await db
        .insert(ticketForwards)
        .values({
          ticketId: input.ticketId,
          ticketMessageId: input.messageId,
          to: input.to,
          cc: input.cc || [],
          bcc: input.bcc || [],
          subject: input.subject,
          body: input.body,
          createdBy: input.forwardedBy,
        })
        .returning();

      const messageId = `forward-${randomBytes(8).toString("hex")}@ticket-app`;

      const [emailMessage] = await db
        .insert(emailMessages)
        .values({
          organizationId: ticket.organizationId,
          mailboxId: ticket.mailboxId,
          ticketId: input.ticketId,
          direction: "outbound",
          messageId,
          toEmails: input.to,
          ccEmails: input.cc || null,
          bccEmails: input.bcc || null,
          subject: input.subject || `Fwd: ${ticket.subject}`,
          bodyHtml: input.body,
          sentAt: new Date(),
          receivedAt: new Date(),
        })
        .returning();

      await addEmailSendJob(emailMessage.id);

      return forward;
    }),

  list: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.ticketForwards.findMany({
        where: eq(ticketForwards.ticketId, input.ticketId),
        orderBy: [desc(ticketForwards.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    return await db.query.ticketForwards.findFirst({
      where: eq(ticketForwards.id, input.id),
    });
  }),
};
