import { Queue, Worker, Job } from "bullmq";
import { eq, and } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { subscriptions, subscriptionPlans } from "@ticket-app/db/schema/_billing";
import { organizations } from "@ticket-app/db/schema/_organizations";
import { invoices } from "@ticket-app/db/schema/_invoices";
import { dunningLogs, subscriptionStateChanges } from "@ticket-app/db/schema/_dunning";
import { stripe } from "../services/stripe";
import { addNotificationJob, addEmailJob, addDunningJob } from "@ticket-app/db/lib/queues";

export const DUNNING_QUEUE = "billing:dunning";

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
};

export const DUNNING_ATTEMPT_DELAYS = {
  1: 0,
  2: 3 * 24 * 60 * 60 * 1000,
  3: 7 * 24 * 60 * 60 * 1000,
  GRACE_END: 14 * 24 * 60 * 60 * 1000,
} as const;

export type DunningJobData = {
  subscriptionId: number;
  invoiceId: number;
  attemptNumber: number;
  action: "retry_charge" | "send_email" | "send_in_app" | "downgrade";
};

export const dunningQueue = new Queue<DunningJobData>(DUNNING_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

async function retryStripePayment(
  invoiceId: number,
  subscriptionId: number,
): Promise<{
  success: boolean;
  gatewayResponse?: Record<string, unknown>;
}> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      organization: true,
    },
  });

  if (!invoice) {
    return { success: false, gatewayResponse: { error: "Invoice not found" } };
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      stripeSubscription: true,
    },
  });

  if (!subscription?.stripeSubscription?.stripeSubscriptionId) {
    return { success: false, gatewayResponse: { error: "No Stripe subscription found" } };
  }

  try {
    const paymentIntents = await stripe.invoices.listPaymentIntents(
      subscription.stripeSubscription.stripeSubscriptionId,
    );

    if (paymentIntents.data.length > 0) {
      const paymentIntent = paymentIntents.data[0];
      if (
        paymentIntent.status === "requires_payment_method" ||
        paymentIntent.status === "requires_action"
      ) {
        await stripe.paymentIntents.confirm(paymentIntent.id);
      }
    }

    return { success: true, gatewayResponse: { message: "Payment retry initiated" } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, gatewayResponse: { error: errorMessage } };
  }
}

async function logDunningAttempt(
  subscriptionId: number,
  invoiceId: number,
  attemptNumber: number,
  action: string,
  result: string,
  gatewayResponse?: Record<string, unknown>,
) {
  await db.insert(dunningLogs).values({
    subscriptionId,
    invoiceId,
    attemptNumber,
    action,
    result,
    gatewayResponse,
    executedAt: new Date(),
  });
}

async function sendDunningEmail(
  organizationId: number,
  invoiceNumber: string,
  attemptNumber: number,
) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org?.name) return;

  const emailTemplates: Record<number, { subject: string; body: string }> = {
    1: {
      subject: `Payment Failed - Invoice ${invoiceNumber}`,
      body: `Dear ${org.name},

We were unable to process your payment for invoice ${invoiceNumber}. Please update your payment method to avoid service interruption.

To update your payment method, please visit your billing portal.

If you have any questions, please contact our support team.`,
    },
    2: {
      subject: `Payment Failed - Urgent Action Required - Invoice ${invoiceNumber}`,
      body: `Dear ${org.name},

Your payment for invoice ${invoiceNumber} has failed. This is your second attempt.

Please update your payment method immediately to avoid service interruption. Your subscription will be downgraded to the Free plan after the grace period.

To update your payment method, please visit your billing portal.`,
    },
    3: {
      subject: `Final Notice - Service Termination Imminent - Invoice ${invoiceNumber}`,
      body: `Dear ${org.name},

This is a final notice that your payment for invoice ${invoiceNumber} has failed. 

Your account is in the grace period and will be downgraded to the Free plan if payment is not received within 7 days.

Please update your payment method immediately to avoid service interruption.`,
    },
  };

  const template = emailTemplates[attemptNumber] || emailTemplates[1];

  await addEmailJob({
    to: org.name,
    subject: template.subject,
    body: template.body,
  });
}

async function sendInAppNotification(organizationId: number, message: string) {
  await addNotificationJob({
    userId: `org-${organizationId}`,
    type: "billing_alert",
    title: "Payment Issue",
    message,
    metadata: { organizationId },
  });
}

async function downgradeToFreePlan(subscriptionId: number) {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      organization: true,
    },
  });

  if (!subscription) return;

  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, "free"),
  });

  if (!freePlan) return;

  const previousState = subscription.status;

  await db
    .update(subscriptions)
    .set({
      planId: freePlan.id,
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));

  await db
    .update(organizations)
    .set({
      planId: freePlan.id,
      maxAgents: freePlan.maxAgents,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, subscription.organizationId));

  await db.insert(subscriptionStateChanges).values({
    subscriptionId,
    fromState: previousState,
    toState: "canceled",
    reason: "dunning_failed",
    metadata: { downgradeToFree: true },
    changedAt: new Date(),
  });

  await logDunningAttempt(subscriptionId, 0, 3, "downgrade", "succeeded");

  await sendInAppNotification(
    subscription.organizationId,
    "Your subscription has been downgraded to the Free plan due to payment failure.",
  );
}

async function processDunningAction(job: Job<DunningJobData>) {
  const { subscriptionId, invoiceId, attemptNumber, action } = job.data;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      organization: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.status === "canceled" || subscription.status === "paused") {
    await logDunningAttempt(subscriptionId, invoiceId, attemptNumber, action, "skipped");
    return;
  }

  switch (action) {
    case "retry_charge": {
      const result = await retryStripePayment(invoiceId, subscriptionId);
      await logDunningAttempt(
        subscriptionId,
        invoiceId,
        attemptNumber,
        action,
        result.success ? "succeeded" : "failed",
        result.gatewayResponse,
      );

      if (result.success) {
        await db
          .update(invoices)
          .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
          .where(eq(invoices.id, invoiceId));

        await db
          .update(subscriptions)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));
      }
      break;
    }

    case "send_email": {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });
      await sendDunningEmail(
        subscription.organizationId,
        invoice?.number || "Unknown",
        attemptNumber,
      );
      await logDunningAttempt(subscriptionId, invoiceId, attemptNumber, action, "succeeded");
      break;
    }

    case "send_in_app": {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });
      const message = `Payment for invoice ${invoice?.number} has failed. Please update your payment method.`;
      await sendInAppNotification(subscription.organizationId, message);
      await logDunningAttempt(subscriptionId, invoiceId, attemptNumber, action, "succeeded");
      break;
    }

    case "downgrade": {
      await downgradeToFreePlan(subscriptionId);
      break;
    }
  }
}

export function createDunningWorker() {
  return new Worker<DunningJobData>(
    DUNNING_QUEUE,
    async (job) => {
      await processDunningAction(job);
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

export async function scheduleDunningForInvoice(
  subscriptionId: number,
  invoiceId: number,
): Promise<void> {
  const attempts = [
    { attemptNumber: 1, action: "retry_charge" as const, delay: DUNNING_ATTEMPT_DELAYS[1] },
    { attemptNumber: 2, action: "retry_charge" as const, delay: DUNNING_ATTEMPT_DELAYS[2] },
    { attemptNumber: 3, action: "retry_charge" as const, delay: DUNNING_ATTEMPT_DELAYS[3] },
    { attemptNumber: 3, action: "downgrade" as const, delay: DUNNING_ATTEMPT_DELAYS.GRACE_END },
  ];

  for (const attempt of attempts) {
    await addDunningJob({
      subscriptionId,
      invoiceId,
      attemptNumber: attempt.attemptNumber,
      action: attempt.action,
    });
  }
}

export async function getFailedInvoicesForDunning(): Promise<(typeof invoices.$inferSelect)[]> {
  const failedInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.status, "failed")),
    with: {
      subscription: true,
    },
  });

  return failedInvoices;
}

export { Job };
