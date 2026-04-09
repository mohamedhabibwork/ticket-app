import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { ArrowLeft, Sparkles, Zap, Crown, Building2, HelpCircle } from "lucide-react";

const PLANS = [
  {
    slug: "free",
    name: "Free",
    icon: Sparkles,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    monthly: 0,
    annual: 0,
    description: "Perfect for getting started",
    features: {
      agents: 3,
      mailboxes: 1,
      forms: 1,
      ecommerce: 0,
      social: false,
      reports: "basic",
      sla: false,
      support: "community",
    },
    featureList: [
      "3 agents",
      "1 mailbox",
      "1 form",
      "Basic reports",
      "Community support",
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    icon: Zap,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    monthly: 29,
    annual: 24,
    description: "For small teams getting started",
    features: {
      agents: 10,
      mailboxes: 3,
      forms: 5,
      ecommerce: 1,
      social: false,
      reports: "basic",
      sla: false,
      support: "priority",
    },
    featureList: [
      "10 agents",
      "3 mailboxes",
      "5 forms",
      "1 eCommerce store",
      "Priority support",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    monthly: 99,
    annual: 79,
    description: "For growing support teams",
    features: {
      agents: 50,
      mailboxes: 10,
      forms: -1,
      ecommerce: 5,
      social: true,
      reports: "advanced",
      sla: true,
      support: "priority",
    },
    featureList: [
      "50 agents",
      "10 mailboxes",
      "Unlimited forms",
      "5 eCommerce stores",
      "Social accounts",
      "Advanced reports",
      "SLA support",
      "Priority support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    icon: Building2,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    monthly: 299,
    annual: 239,
    description: "For large organizations",
    features: {
      agents: -1,
      mailboxes: -1,
      forms: -1,
      ecommerce: -1,
      social: true,
      reports: "advanced",
      sla: true,
      support: "dedicated",
    },
    featureList: [
      "Unlimited agents",
      "Unlimited mailboxes",
      "Unlimited forms",
      "Unlimited eCommerce",
      "Social accounts",
      "Advanced reports",
      "SLA support",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "Can I change my plan at any time?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.",
  },
  {
    question: "What happens when I exceed my seat limit?",
    answer: "You'll receive a notification when approaching your seat limit. You can upgrade your plan or remove users to free up seats.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "Yes, all paid plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure Stripe integration.",
  },
  {
    question: "Can I get a refund?",
    answer: "We offer a 30-day money-back guarantee for all new subscriptions. Contact support for assistance.",
  },
];

export default function PlanUpgradePage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => orpc.subscriptions.get.query({ organizationId: 1 }),
  });

  const upgradeMutation = useMutation({
    mutationFn: async ({ planSlug }: { planSlug: string }) => {
      const plan = PLANS.find((p) => p.slug === planSlug);
      if (!plan) throw new Error("Plan not found");
      return await orpc.subscriptions.create.mutate({
        organizationId: 1,
        planId: plan.slug,
        billingCycle,
        seatCount: 1,
      });
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ planSlug }: { planSlug: string }) => {
      const plan = PLANS.find((p) => p.slug === planSlug);
      if (!plan) throw new Error("Plan not found");
      return await orpc.subscriptions.update.mutate({
        organizationId: 1,
        planId: plan.slug,
      });
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  const currentPlanSlug = subscription?.plan?.slug || "free";
  const currentPlanIndex = PLANS.findIndex((p) => p.slug === currentPlanSlug);

  const handlePlanAction = (planSlug: string, index: number) => {
    if (planSlug === currentPlanSlug) return;
    
    if (currentPlanSlug === "free" || !subscription) {
      upgradeMutation.mutate({ planSlug });
    } else if (index < currentPlanIndex) {
      updateMutation.mutate({ planSlug });
    } else {
      upgradeMutation.mutate({ planSlug });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/billing">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-1">
          Select the plan that best fits your team's needs
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            billingCycle === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          Annual
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            Save 20%
          </Badge>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan, index) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.slug === currentPlanSlug;
          const isDowngrade = index < currentPlanIndex && !isCurrentPlan;
          const isUpgrade = index > currentPlanIndex;
          const price = billingCycle === "annual" ? plan.annual : plan.monthly;

          return (
            <Card
              key={plan.slug}
              className={`relative ${
                isCurrentPlan ? "ring-2 ring-primary" : ""
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                    <Icon className={`h-5 w-5 ${plan.color}`} />
                  </div>
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {plan.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">
                    {price === 0 ? "Free" : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground">/{billingCycle === "annual" ? "mo" : "month"}</span>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.featureList.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <CheckIcon className="h-4 w-4 mr-2 text-green-600 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrentPlan ? "outline" : isDowngrade ? "outline" : "default"}
                  className="w-full"
                  disabled={isCurrentPlan || upgradeMutation.isPending || updateMutation.isPending}
                  onClick={() => handlePlanAction(plan.slug, index)}
                >
                  {isCurrentPlan
                    ? "Current Plan"
                    : isDowngrade
                    ? "Downgrade"
                    : isUpgrade
                    ? "Upgrade"
                    : "Select"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FAQ_ITEMS.map((faq, index) => (
            <div key={index} className="border-b last:border-0 pb-4">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between text-left font-medium"
              >
                {faq.question}
                <span className="text-muted-foreground">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && (
                <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
