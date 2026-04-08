import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { subscriptions, subscriptionPlans } from "@ticket-app/db/schema/_billing";
import { organizations } from "@ticket-app/db/schema/_organizations";
import { subscriptionStateChanges } from "@ticket-app/db/schema/_dunning";
import { addNotificationJob } from "@ticket-app/db/lib/queues";
import { stripe } from "./stripe";

export type SubscriptionState =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "unpaid";

export type StateTransitionReason =
  | "payment_failed"
  | "payment_succeeded"
  | "manual_cancel"
  | "trial_ended"
  | "grace_expired"
  | "upgrade"
  | "downgrade"
  | "pause"
  | "resume"
  | "external";

const STATE_TRANSITIONS: Record<SubscriptionState, SubscriptionState[]> = {
  trialing: ["active", "canceled"],
  active: ["past_due", "canceled", "paused"],
  past_due: ["active", "canceled", "grace_expired" as SubscriptionState],
  canceled: [],
  paused: ["active", "canceled"],
  unpaid: ["active", "canceled"],
};

const ENTERPRISE_ONLY_STATES: SubscriptionState[] = ["paused"];

export function canTransitionTo(
  currentState: SubscriptionState,
  newState: SubscriptionState,
): boolean {
  if (ENTERPRISE_ONLY_STATES.includes(newState)) {
    return false;
  }
  return STATE_TRANSITIONS[currentState]?.includes(newState) || false;
}

export function isStateAllowedForPlan(state: SubscriptionState, planSlug: string): boolean {
  if (state === "paused" && planSlug !== "enterprise") {
    return false;
  }
  return true;
}

async function recordStateChange(
  subscriptionId: number,
  fromState: SubscriptionState,
  toState: SubscriptionState,
  reason: StateTransitionReason,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(subscriptionStateChanges).values({
    subscriptionId,
    fromState,
    toState,
    reason,
    metadata: metadata || {},
    changedAt: new Date(),
  });
}

async function notifyAboutStateChange(
  organizationId: number,
  fromState: SubscriptionState,
  toState: SubscriptionState,
): Promise<void> {
  const stateChangeMessages: Record<string, string> = {
    "trialing->active": "Your trial period has ended and your subscription is now active.",
    "active->past_due": "Your subscription payment is past due. Please update your payment method.",
    "past_due->active": "Your payment was successful and your subscription is now active.",
    "past_due->canceled": "Your subscription has been canceled due to payment failure.",
    "active->paused": "Your subscription has been paused.",
    "paused->active": "Your subscription has been resumed.",
    "active->canceled": "Your subscription has been canceled.",
    "canceled->active": "Your subscription has been reactivated.",
  };

  const messageKey = `${fromState}->${toState}`;
  const message =
    stateChangeMessages[messageKey] ||
    `Your subscription state changed from ${fromState} to ${toState}.`;

  const notificationType =
    toState === "past_due" || toState === "canceled" ? "billing_alert" : "subscription_update";

  await addNotificationJob({
    userId: `org-${organizationId}`,
    type: notificationType,
    title: `Subscription ${toState === "active" ? "Activated" : toState === "past_due" ? "Payment Due" : "Update"}`,
    message,
    metadata: {
      fromState,
      toState,
      organizationId,
    },
  });
}

export async function transitionSubscriptionState(
  subscriptionId: number,
  newState: SubscriptionState,
  reason: StateTransitionReason,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      organization: true,
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  const currentState = subscription.status as SubscriptionState;

  if (!canTransitionTo(currentState, newState)) {
    console.warn(
      `[Subscription] Invalid transition: ${currentState} -> ${newState} for subscription ${subscriptionId}`,
    );
    return false;
  }

  if (!isStateAllowedForPlan(newState, subscription.plan?.slug || "")) {
    console.warn(
      `[Subscription] State ${newState} is not allowed for plan ${subscription.plan?.slug}`,
    );
    return false;
  }

  await db
    .update(subscriptions)
    .set({
      status: newState,
      updatedAt: new Date(),
      ...(newState === "paused" ? { pausedAt: new Date() } : {}),
      ...(newState === "active" && subscription.pausedAt ? { pausedAt: null } : {}),
    })
    .where(eq(subscriptions.id, subscriptionId));

  await recordStateChange(subscriptionId, currentState, newState, reason, metadata);

  await notifyAboutStateChange(subscription.organizationId, currentState, newState);

  return true;
}

export async function pauseSubscription(subscriptionId: number): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.plan?.slug !== "enterprise") {
    throw new Error("Only Enterprise plans can be paused");
  }

  return transitionSubscriptionState(subscriptionId, "paused", "pause");
}

export async function resumeSubscription(subscriptionId: number): Promise<boolean> {
  return transitionSubscriptionState(subscriptionId, "active", "resume");
}

export async function cancelSubscription(
  subscriptionId: number,
  immediate: boolean = false,
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (immediate) {
    return transitionSubscriptionState(subscriptionId, "canceled", "manual_cancel");
  }

  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));

  return true;
}

export async function handlePaymentFailure(
  subscriptionId: number,
  gracePeriodDays: number = 14,
): Promise<void> {
  await transitionSubscriptionState(subscriptionId, "past_due", "payment_failed", {
    gracePeriodDays,
  });
}

export async function handlePaymentSuccess(subscriptionId: number): Promise<boolean> {
  return transitionSubscriptionState(subscriptionId, "active", "payment_succeeded");
}

export async function checkAndTransitionFromTrial(subscriptionId: number): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      stripeSubscription: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  if (subscription.status === "trialing" && subscription.trialEnd) {
    const now = new Date();
    if (now >= subscription.trialEnd) {
      if (subscription.stripeSubscription?.stripeSubscriptionId) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.stripeSubscription.stripeSubscriptionId,
          );

          if (stripeSub.status === "active") {
            return transitionSubscriptionState(subscriptionId, "active", "trial_ended");
          }
        } catch (error) {
          console.error("[Subscription] Error checking Stripe trial status:", error);
        }
      }

      return transitionSubscriptionState(subscriptionId, "active", "trial_ended");
    }
  }

  return false;
}

export async function getSubscriptionStateHistory(
  subscriptionId: number,
): Promise<(typeof subscriptionStateChanges.$inferSelect)[]> {
  const history = await db.query.subscriptionStateChanges.findMany({
    where: eq(subscriptionStateChanges.subscriptionId, subscriptionId),
    orderBy: (sc, { desc }) => [desc(sc.changedAt)],
  });

  return history;
}

export async function downgradeToFreePlan(subscriptionId: number): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
    with: {
      organization: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  const freePlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, "free"),
  });

  if (!freePlan) {
    throw new Error("Free plan not found");
  }

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

  await recordStateChange(
    subscriptionId,
    subscription.status as SubscriptionState,
    "canceled",
    "grace_expired",
    { downgradeToFree: true },
  );

  return true;
}
