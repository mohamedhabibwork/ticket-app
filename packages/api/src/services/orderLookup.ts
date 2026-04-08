import { db } from "@ticket-app/db";
import { ecommerceOrders, ecommerceStores, contacts } from "@ticket-app/db/schema";
import { eq, and, isNull, or, sql, desc } from "drizzle-orm";

export interface OrderLookupResult {
  orders: Awaited<ReturnType<typeof db.query.ecommerceOrders.findMany>>;
  matchedBy: "email" | "phone" | "order_id" | "contact";
  query: string;
}

export async function lookupOrdersByEmail(
  organizationId: number,
  email: string
): Promise<OrderLookupResult> {
  const storeIds = (
    await db.query.ecommerceStores.findMany({
      where: and(
        eq(ecommerceStores.organizationId, organizationId),
        isNull(ecommerceStores.deletedAt)
      ),
      columns: { id: true },
    })
  ).map((s) => s.id);

  if (storeIds.length === 0) {
    return { orders: [], matchedBy: "email", query: email };
  }

  const orders = await db.query.ecommerceOrders.findMany({
    where: and(
      sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
      eq(ecommerceOrders.customerEmail, email.toLowerCase()),
      isNull(ecommerceOrders.deletedAt)
    ),
    orderBy: [desc(ecommerceOrders.createdAt)],
    with: {
      store: true,
    },
  });

  return { orders, matchedBy: "email", query: email };
}

export async function lookupOrdersByPhone(
  organizationId: number,
  phone: string
): Promise<OrderLookupResult> {
  const normalizedPhone = phone.replace(/\D/g, "");

  const storeIds = (
    await db.query.ecommerceStores.findMany({
      where: and(
        eq(ecommerceStores.organizationId, organizationId),
        isNull(ecommerceStores.deletedAt)
      ),
      columns: { id: true },
    })
  ).map((s) => s.id);

  if (storeIds.length === 0) {
    return { orders: [], matchedBy: "phone", query: phone };
  }

  const orders = await db.query.ecommerceOrders.findMany({
    where: and(
      sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
      sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${ecommerceOrders.customerPhone}, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') LIKE ${`%${normalizedPhone}%`}`,
      isNull(ecommerceOrders.deletedAt)
    ),
    orderBy: [desc(ecommerceOrders.createdAt)],
    with: {
      store: true,
    },
  });

  return { orders, matchedBy: "phone", query: phone };
}

export async function lookupOrdersByOrderId(
  organizationId: number,
  orderId: string
): Promise<OrderLookupResult> {
  const storeIds = (
    await db.query.ecommerceStores.findMany({
      where: and(
        eq(ecommerceStores.organizationId, organizationId),
        isNull(ecommerceStores.deletedAt)
      ),
      columns: { id: true },
    })
  ).map((s) => s.id);

  if (storeIds.length === 0) {
    return { orders: [], matchedBy: "order_id", query: orderId };
  }

  const orders = await db.query.ecommerceOrders.findMany({
    where: and(
      sql`${ecommerceOrders.storeId} IN (${sql.join(storeIds.map(id => sql`${id}`), sql`, `)})`,
      or(
        eq(ecommerceOrders.platformOrderId, orderId),
        eq(ecommerceOrders.orderNumber, orderId)
      ),
      isNull(ecommerceOrders.deletedAt)
    ),
    orderBy: [desc(ecommerceOrders.createdAt)],
    with: {
      store: true,
    },
  });

  return { orders, matchedBy: "order_id", query: orderId };
}

export async function lookupOrdersByContact(
  contactId: number
): Promise<OrderLookupResult> {
  const orders = await db.query.ecommerceOrders.findMany({
    where: and(
      eq(ecommerceOrders.contactId, contactId),
      isNull(ecommerceOrders.deletedAt)
    ),
    orderBy: [desc(ecommerceOrders.createdAt)],
    with: {
      store: true,
    },
  });

  return { orders, matchedBy: "contact", query: String(contactId) };
}

export async function lookupOrdersSmart(
  organizationId: number,
  query: string
): Promise<OrderLookupResult> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;

  if (emailRegex.test(query)) {
    return lookupOrdersByEmail(organizationId, query);
  }

  if (phoneRegex.test(query)) {
    return lookupOrdersByPhone(organizationId, query);
  }

  return lookupOrdersByOrderId(organizationId, query);
}

export async function linkOrderToContact(
  orderId: number,
  contactId: number
): Promise<void> {
  await db
    .update(ecommerceOrders)
    .set({
      contactId,
      updatedAt: new Date(),
    })
    .where(eq(ecommerceOrders.id, orderId));
}

export async function findOrCreateContactFromOrder(
  order: Awaited<ReturnType<typeof db.query.ecommerceOrders.findFirst>> & { store?: { organizationId: number } | null }
): Promise<number | null> {
  if (!order) return null;

  const existingContact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.organizationId, sql`1`), 
      or(
        order.customerEmail ? eq(contacts.email, order.customerEmail) : sql`false`,
        order.customerPhone ? sql`false` : sql`false`
      )
    ),
  });

  if (existingContact) {
    if (!order.contactId) {
      await linkOrderToContact(order.id, existingContact.id);
    }
    return existingContact.id;
  }

  const store = order.store;
  if (!store) return null;

  const [newContact] = await db
    .insert(contacts)
    .values({
      organizationId: store.organizationId,
      email: order.customerEmail,
      phone: order.customerPhone,
      firstName: order.customerName?.split(" ")[0] || null,
      lastName: order.customerName?.split(" ").slice(1).join(" ") || null,
    })
    .returning();

  if (newContact) {
    await linkOrderToContact(order.id, newContact.id);
    return newContact.id;
  }

  return null;
}
