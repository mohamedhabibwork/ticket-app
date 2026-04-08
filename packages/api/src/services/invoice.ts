import { db } from "@ticket-app/db";
import { invoices, invoiceItems, subscriptions, organizations } from "@ticket-app/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceParams {
  organizationId: number;
  subscriptionId?: number;
  items: InvoiceItemInput[];
  taxRate: number;
  dueDays: number;
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export async function generateInvoiceNumber(organizationId: number): Promise<string> {
  const year = new Date().getFullYear();

  const lastInvoice = await db.query.invoices.findFirst({
    where: eq(invoices.organizationId, organizationId),
    orderBy: [desc(invoices.createdAt)],
  });

  let sequence = 1;
  if (lastInvoice?.number) {
    const parts = lastInvoice.number.split("-");
    const lastYear = parseInt(parts[2]);
    const lastSeq = parseInt(parts[parts.length - 1]);

    if (lastYear === year) {
      sequence = lastSeq + 1;
    }
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  const orgSlug = org?.slug || "org";
  const paddedSeq = sequence.toString().padStart(4, "0");

  return `INV-${orgSlug}-${year}-${paddedSeq}`;
}

export async function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  taxRate: number
): Promise<{
  subtotal: number;
  taxAmount: number;
  total: number;
}> {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmount;

  return { subtotal, taxAmount, total };
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<typeof invoices.$inferSelect> {
  const number = await generateInvoiceNumber(params.organizationId);
  const currency = params.currency || "USD";

  const { subtotal, taxAmount, total } = await calculateInvoiceTotals(
    params.items,
    params.taxRate
  );

  const now = new Date();
  const periodStart = params.periodStart || now;
  const periodEnd = params.periodEnd || now;
  const dueDate = new Date(now.getTime() + params.dueDays * 24 * 60 * 60 * 1000);

  const [invoice] = await db
    .insert(invoices)
    .values({
      organizationId: params.organizationId,
      subscriptionId: params.subscriptionId,
      number,
      status: "draft",
      currency,
      subtotal,
      taxAmount,
      taxRate: params.taxRate,
      total,
      periodStart,
      periodEnd,
      dueDate,
    })
    .returning();

  if (params.items.length > 0) {
    await db.insert(invoiceItems).values(
      params.items.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
      }))
    );
  }

  return invoice;
}

export async function getInvoiceWithDetails(invoiceId: number) {
  return await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      items: true,
      payments: true,
      subscription: {
        with: {
          plan: true,
          organization: true,
        },
      },
      organization: true,
    },
  });
}

export async function finalizeInvoice(invoiceId: number): Promise<void> {
  await db
    .update(invoices)
    .set({ status: "finalized", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

export async function markInvoiceAsPaid(
  invoiceId: number,
  paymentId?: number
): Promise<void> {
  await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

export async function voidInvoice(invoiceId: number): Promise<void> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (invoice?.status === "paid") {
    throw new Error("Cannot void a paid invoice");
  }

  await db
    .update(invoices)
    .set({ status: "void", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

export async function getNextInvoiceNumber(organizationId: number): Promise<string> {
  return await generateInvoiceNumber(organizationId);
}

export async function getPendingInvoices(organizationId: number) {
  return await db.query.invoices.findMany({
    where: and(
      eq(invoices.organizationId, organizationId),
      sql`${invoices.status} IN ('draft', 'finalized', 'overdue')`
    ),
    with: {
      items: true,
    },
    orderBy: [desc(invoices.dueDate)],
  });
}

export async function getInvoiceStats(organizationId: number) {
  const stats = await db
    .select({
      status: invoices.status,
      count: sql<number>`count(*)`,
      totalAmount: sql<number>`sum(${invoices.total})`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .groupBy(invoices.status);

  return stats.reduce(
    (acc, row) => {
      acc[row.status] = {
        count: Number(row.count),
        totalAmount: Number(row.totalAmount || 0),
      };
      return acc;
    },
    {} as Record<string, { count: number; totalAmount: number }>
  );
}
