import { stripe } from "@ticket-app/api/services/stripe";
import { env } from "@ticket-app/env/server";
import { db } from "@ticket-app/db";
import {
  stripeSubscriptions,
  subscriptions,
  stripeCustomers,
  invoices,
} from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const app = new Hono();

app.post("/stripe", async (c) => {
  const payload = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig) {
    return c.json({ error: "Missing signature" }, 400);
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return c.json({ error: `Webhook Error: ${err.message}` }, 400);
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const stripeSub = event.data.object;
        await handleSubscriptionUpdate(stripeSub);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        await handleSubscriptionCanceled(stripeSub);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return c.json({ error: "Webhook handler failed" }, 500);
  }
});

async function handleSubscriptionUpdate(stripeSub: any) {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.customerId, stripeSub.customer),
  });

  if (!customer) {
    console.log("Customer not found for stripe customer:", stripeSub.customer);
    return;
  }

  const existingStripeSub = await db.query.stripeSubscriptions.findFirst({
    where: eq(stripeSubscriptions.stripeSubscriptionId, stripeSub.id),
  });

  const now = new Date();
  const periodStart = new Date(stripeSub.current_period_start * 1000);
  const periodEnd = new Date(stripeSub.current_period_end * 1000);

  if (existingStripeSub) {
    await db
      .update(stripeSubscriptions)
      .set({
        status: stripeSub.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
        trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        updatedAt: now,
      })
      .where(eq(stripeSubscriptions.id, existingStripeSub.id));
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, customer.organizationId),
  });

  if (subscription) {
    let status: "active" | "past_due" | "canceled" | "trialing" | "paused" = "active";

    if (stripeSub.status === "past_due") status = "past_due";
    if (stripeSub.status === "canceled") status = "canceled";
    if (stripeSub.status === "trialing") status = "trialing";
    if (stripeSub.status === "paused") status = "paused";

    await db
      .update(subscriptions)
      .set({
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

async function handleSubscriptionCanceled(stripeSub: any) {
  const existingStripeSub = await db.query.stripeSubscriptions.findFirst({
    where: eq(stripeSubscriptions.stripeSubscriptionId, stripeSub.id),
  });

  if (!existingStripeSub) return;

  await db
    .update(stripeSubscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(stripeSubscriptions.id, existingStripeSub.id));

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existingStripeSub.subscriptionId));
}

async function handleInvoicePaid(invoice: any) {
  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.customerId, invoice.customer),
  });

  if (!customer) return;

  if (invoice.subscription) {
    const stripeSub = await db.query.stripeSubscriptions.findFirst({
      where: eq(stripeSubscriptions.stripeSubscriptionId, invoice.subscription),
    });

    if (stripeSub) {
      const sub = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, stripeSub.subscriptionId),
      });

      if (sub) {
        await db
          .update(subscriptions)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));
      }
    }
  }

  if (invoice.metadata?.invoiceId) {
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parseInt(invoice.metadata.invoiceId)));
  }
}

async function handlePaymentFailed(invoice: any) {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.customerId, invoice.customer),
  });

  if (!customer) return;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, customer.organizationId),
  });

  if (subscription) {
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log("Payment intent failed:", paymentIntent.id);
}

async function handleCheckoutCompleted(session: any) {
  if (!session.metadata?.organizationId) return;

  const organizationId = parseInt(session.metadata.organizationId);
  const stripeSubscriptionId = session.subscription;

  if (stripeSubscriptionId) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const localSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId),
    });

    if (!localSubscription) {
      console.log("Local subscription not found for org:", organizationId);
      return;
    }

    await db.insert(stripeSubscriptions).values({
      subscriptionId: localSubscription.id,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: session.customer,
      status: stripeSub.status,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    });
  }
}

export default app;
