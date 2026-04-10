import { randomBytes } from "crypto";

import { db } from "@ticket-app/db";
import { ticketForwards, tickets, emailMessages } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import { addEmailSendJob } from "../jobs/emailSend";

export const ticketForwardsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        ticketId: z.coerce.number(),
        messageId: z.coerce.number().optional(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().optional(),
        body: z.string(),
        forwardedBy: z.coerce.number(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_FORWARDS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Ticket forward write permission required");
      }

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

  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        ticketId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_FORWARDS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Ticket forward read permission required");
      }

      return await db.query.ticketForwards.findMany({
        where: eq(ticketForwards.ticketId, input.ticketId),
        orderBy: [desc(ticketForwards.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_FORWARDS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Ticket forward read permission required");
      }

      return await db.query.ticketForwards.findFirst({
        where: eq(ticketForwards.id, input.id),
      });
    }),
};
