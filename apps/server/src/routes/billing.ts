import { paytabs } from "@ticket-app/api/services/paytabs";
import { db } from "@ticket-app/db";
import { invoices } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { env } from "@ticket-app/env/server";

const app = new Hono();

app.post("/paytabs/create-payment", async (c) => {
  try {
    const body = await c.req.json();

    const {
      organizationId,
      invoiceId,
      amount,
      currency,
      customerEmail,
      customerPhone,
      customerName,
      returnUrl,
    } = body;

    if (!organizationId || !invoiceId || !amount || !customerEmail) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        organization: true,
      },
    });

    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    const webhookUrl = `${env.CORS_ORIGIN}/api/webhooks/paytabs`;

    const result = await paytabs.initializePayment(organizationId, {
      amount,
      currency: currency || invoice.currency || "USD",
      orderId: `INV-${invoice.number}`,
      customerEmail,
      customerPhone: customerPhone || "",
      customerName: customerName || invoice.organization?.name || "Customer",
      productName: `Invoice ${invoice.number}`,
      returnUrl: returnUrl || `${env.CORS_ORIGIN}/billing`,
      webhookUrl,
    });

    return c.json({
      success: true,
      transactionId: result.transactionId,
      paymentUrl: result.paymentUrl,
    });
  } catch (err: any) {
    console.error("PayTabs create payment error:", err);
    return c.json({ error: err.message || "Failed to create payment" }, 500);
  }
});

app.post("/paytabs/verify-payment", async (c) => {
  try {
    const body = await c.req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return c.json({ error: "Transaction ID required" }, 400);
    }

    const result = await paytabs.verifyPayment(transactionId);

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("PayTabs verify payment error:", err);
    return c.json({ error: err.message || "Failed to verify payment" }, 500);
  }
});

app.post("/paytabs/create-token", async (c) => {
  try {
    const body = await c.req.json();

    const { organizationId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName, email } =
      body;

    if (
      !organizationId ||
      !cardNumber ||
      !expiryMonth ||
      !expiryYear ||
      !cvv ||
      !cardholderName ||
      !email
    ) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const result = await paytabs.createToken(organizationId, {
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      email,
    });

    return c.json({
      success: true,
      token: result.token,
      cardLast4: result.cardLast4,
      cardBrand: result.cardBrand,
    });
  } catch (err: any) {
    console.error("PayTabs create token error:", err);
    return c.json({ error: err.message || "Failed to create token" }, 500);
  }
});

app.post("/paytabs/refund", async (c) => {
  try {
    const body = await c.req.json();

    const { transactionId, amount, reason } = body;

    if (!transactionId || !amount) {
      return c.json({ error: "Transaction ID and amount required" }, 400);
    }

    const result = await paytabs.refundPayment(transactionId, amount, reason);

    return c.json({
      success: result.success,
      transactionId: result.transactionId,
      refundReference: result.refundReference,
      message: result.message,
    });
  } catch (err: any) {
    console.error("PayTabs refund error:", err);
    return c.json({ error: err.message || "Failed to process refund" }, 500);
  }
});

export default app;
