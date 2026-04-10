import Stripe from "stripe";
import { env } from "@ticket-app/env/server";
import { db } from "@ticket-app/db";
import { stripeCustomers } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function getOrCreateStripeCustomer(
  organizationId: number,
  email: string,
  name: string,
): Promise<string> {
  let customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.organizationId, organizationId),
  });

  if (customer) {
    return customer.customerId;
  }

  const newCustomer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId: organizationId.toString(),
    },
  });

  await db.insert(stripeCustomers).values({
    organizationId,
    customerId: newCustomer.id,
    email,
  });

  return newCustomer.id;
}

export async function createStripeSubscription(params: {
  organizationId: number;
  priceId: string;
  seatCount: number;
  billingCycle: "monthly" | "annual";
}): Promise<Stripe.Subscription> {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.organizationId, params.organizationId),
  });

  if (!customer) {
    throw new Error("Stripe customer not found");
  }

  const subscription = await stripe.subscriptions.create({
    customer: customer.customerId,
    items: [
      {
        price: params.priceId,
        quantity: params.seatCount,
      },
    ],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      organizationId: params.organizationId.toString(),
    },
  });

  return subscription;
}

export async function updateStripeSubscription(params: {
  stripeSubscriptionId: string;
  priceId?: string;
  seatCount?: number;
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(params.stripeSubscriptionId);

  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [],
  };

  if (params.priceId || params.seatCount !== undefined) {
    const itemId = subscription.items.data[0]?.id;
    if (itemId) {
      updateParams.items = [
        {
          id: itemId,
          price: params.priceId,
          quantity: params.seatCount,
        },
      ];
    }
  }

  const updated = await stripe.subscriptions.update(params.stripeSubscriptionId, updateParams);

  return updated;
}

export async function cancelStripeSubscription(params: {
  stripeSubscriptionId: string;
  immediate: boolean;
}): Promise<Stripe.Subscription> {
  if (params.immediate) {
    return await stripe.subscriptions.cancel(params.stripeSubscriptionId);
  }

  return await stripe.subscriptions.update(params.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function createCheckoutSession(params: {
  organizationId: number;
  priceId: string;
  seatCount: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.organizationId, params.organizationId),
  });

  if (!customer) {
    throw new Error("Stripe customer not found");
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.customerId,
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: params.seatCount,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      organizationId: params.organizationId.toString(),
    },
  });

  return session.url || "";
}

export async function getPaymentMethod(
  paymentMethodId: string,
): Promise<Stripe.PaymentMethod | null> {
  try {
    return await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch {
    return null;
  }
}

export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}
