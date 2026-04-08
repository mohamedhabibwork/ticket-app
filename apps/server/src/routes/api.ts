import { Hono } from "hono";

import { db } from "@ticket-app/db";
import { contacts, tickets, ticketMessages, lookups } from "@ticket-app/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const api = new Hono();

api.post("/tickets", async (c) => {
  try {
    const body = await c.req.json();

    const {
      organizationId,
      email,
      firstName,
      lastName,
      subject,
      description,
      priorityId,
      channelId,
      metadata,
    } = body;

    if (!organizationId || !subject) {
      return c.json({ error: "organizationId and subject are required" }, 400);
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return c.json({ error: "Invalid email format" }, 400);
      }
    }

    let contactId: number | undefined;

    if (email) {
      let contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.email, email.toLowerCase()),
          eq(contacts.organizationId, organizationId),
          isNull(contacts.deletedAt)
        ),
      });

      if (!contact) {
        const [newContact] = await db
          .insert(contacts)
          .values({
            organizationId,
            email: email.toLowerCase(),
            firstName,
            lastName,
            metadata,
          })
          .returning();
        contact = newContact;
      }

      contactId = contact.id;
    }

    const defaultStatusId = (
      await db.query.lookups.findFirst({
        where: and(
          eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`),
          eq(lookups.isDefault, true)
        ),
      })
    )?.id;

    const defaultPriorityId = priorityId || (
      await db.query.lookups.findFirst({
        where: and(
          eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`),
          eq(lookups.isDefault, true)
        ),
      })
    )?.id;

    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tickets)
      .where(
        sql`${tickets.organizationId} = ${organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`
      );
    const sequence = (countResult[0]?.count ?? 0) + 1;
    const referenceNumber = `${prefix}${sequence.toString().padStart(6, "0")}`;

    const [ticket] = await db
      .insert(tickets)
      .values({
        organizationId,
        referenceNumber,
        subject,
        descriptionHtml: description ? `<p>${description}</p>` : null,
        channelId,
        contactId,
        statusId: defaultStatusId,
        priorityId: defaultPriorityId,
      })
      .returning();

    await db
      .insert(ticketMessages)
      .values({
        ticketId: ticket.id,
        authorType: contactId ? "contact" : "system",
        authorContactId: contactId,
        messageType: "public_submission",
        bodyHtml: description ? `<p>${description}</p>` : null,
        bodyText: description,
      })
      .returning();

    return c.json({
      success: true,
      ticketId: ticket.id,
      referenceNumber: ticket.referenceNumber,
    });
  } catch (error) {
    console.error("Public API ticket creation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

api.get("/tickets/:reference", async (c) => {
  try {
    const { reference } = c.req.param();
    const { organizationId } = c.req.query();

    if (!organizationId) {
      return c.json({ error: "organizationId is required" }, 400);
    }

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.referenceNumber, reference),
        eq(tickets.organizationId, parseInt(organizationId)),
        isNull(tickets.deletedAt)
      ),
      with: {
        status: true,
        priority: true,
        channel: true,
        contact: true,
      },
    });

    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }

    return c.json({ ticket });
  } catch (error) {
    console.error("Public API get ticket error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { api };
