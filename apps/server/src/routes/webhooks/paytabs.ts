import { db } from "@ticket-app/db";
import { paytabsTransactions, invoices } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const app = new Hono();

app.post("/paytabs", async (c) => {
  try {
    const body = await c.req.json();

    const eventType = body.event;

    switch (eventType) {
      case "transaction.completed": {
        await handleTransactionCompleted(body);
        break;
      }

      case "transaction.pending": {
        await handleTransactionPending(body);
        break;
      }

      case "transaction.failed": {
        await handleTransactionFailed(body);
        break;
      }

      case "refund.completed": {
        await handleRefundCompleted(body);
        break;
      }

      default:
        console.log(`Unhandled PayTabs event type: ${eventType}`);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error("PayTabs webhook error:", err);
    return c.json({ error: err.message }, 500);
  }
});

async function handleTransactionCompleted(data: any) {
  const tranRef = data.transaction?.tran_ref;
  const isCaptured = data.transaction?.is_captured;

  if (!tranRef) return;

  const existing = await db.query.paytabsTransactions.findFirst({
    where: eq(paytabsTransactions.transactionId, tranRef),
  });

  if (existing) {
    await db
      .update(paytabsTransactions)
      .set({
        status: isCaptured ? "captured" : "pending",
        gatewayResponse: data,
        updatedAt: new Date(),
      })
      .where(eq(paytabsTransactions.id, existing.id));
  }

  if (data.order?.invoice_id) {
    const invoiceId = parseInt(data.order.invoice_id);

    if (isCaptured) {
      await db
        .update(invoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    }
  }
}

async function handleTransactionPending(data: any) {
  const tranRef = data.transaction?.tran_ref;

  if (!tranRef) return;

  const existing = await db.query.paytabsTransactions.findFirst({
    where: eq(paytabsTransactions.transactionId, tranRef),
  });

  if (existing) {
    await db
      .update(paytabsTransactions)
      .set({
        status: "pending",
        gatewayResponse: data,
        updatedAt: new Date(),
      })
      .where(eq(paytabsTransactions.id, existing.id));
  }
}

async function handleTransactionFailed(data: any) {
  const tranRef = data.transaction?.tran_ref;
  const responseCode = data.transaction?.response_code;
  const responseMessage = data.transaction?.response_message;

  if (!tranRef) return;

  const existing = await db.query.paytabsTransactions.findFirst({
    where: eq(paytabsTransactions.transactionId, tranRef),
  });

  if (existing) {
    await db
      .update(paytabsTransactions)
      .set({
        status: "failed",
        responseCode,
        responseMessage,
        gatewayResponse: data,
        updatedAt: new Date(),
      })
      .where(eq(paytabsTransactions.id, existing.id));
  }

  if (data.order?.invoice_id) {
    const invoiceId = parseInt(data.order.invoice_id);

    await db
      .update(invoices)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));
  }
}

async function handleRefundCompleted(data: any) {
  const tranRef = data.transaction?.tran_ref;

  if (!tranRef) return;

  const existing = await db.query.paytabsTransactions.findFirst({
    where: eq(paytabsTransactions.transactionId, tranRef),
  });

  if (existing) {
    await db
      .update(paytabsTransactions)
      .set({
        status: "refunded",
        gatewayResponse: data,
        updatedAt: new Date(),
      })
      .where(eq(paytabsTransactions.id, existing.id));
  }
}

export default app;
