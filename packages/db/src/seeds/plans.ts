export const SUBSCRIPTION_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Perfect for getting started with basic ticketing",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    trialDays: 0,
    maxAgents: 1,
    maxContacts: 100,
    features: [
      "1 agent",
      "100 contacts",
      "Email tickets",
      "Web form tickets",
      "Basic knowledgebase",
      "Email support",
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    description: "For small teams needing more capacity",
    priceMonthly: 2900,
    priceYearly: 29000,
    currency: "USD",
    trialDays: 14,
    maxAgents: 3,
    maxContacts: 1000,
    features: [
      "3 agents",
      "1,000 contacts",
      "Email + web tickets",
      "Saved replies",
      "Basic automation",
      "3 mailboxes",
      "Priority email support",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    description: "For growing support teams with advanced needs",
    priceMonthly: 7900,
    priceYearly: 79000,
    currency: "USD",
    trialDays: 14,
    maxAgents: 10,
    maxContacts: 10000,
    features: [
      "10 agents",
      "10,000 contacts",
      "All channels (email, web, chat, social)",
      "Advanced automation",
      "SLA policies",
      "Unlimited mailboxes",
      "Custom fields",
      "Reports and analytics",
      "Chat widget",
      "Phone support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "For large organizations with complex requirements",
    priceMonthly: 19900,
    priceYearly: 199000,
    currency: "USD",
    trialDays: 30,
    maxAgents: -1,
    maxContacts: -1,
    features: [
      "Unlimited agents",
      "Unlimited contacts",
      "All Professional features",
      "Workflow automation",
      "eCommerce integrations",
      "White-label branding",
      "Custom domain",
      "SSO/SAML",
      "2FA enforcement",
      "Audit logs",
      "API access",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
] as const;

export const PLAN_LIMITS = {
  free: {
    ticketsPerMonth: 50,
    storageMb: 100,
    emailAttachmentsMb: 10,
    knowledgebaseArticles: 10,
    savedReplies: 5,
    forms: 1,
    teams: 1,
  },
  starter: {
    ticketsPerMonth: 500,
    storageMb: 1000,
    emailAttachmentsMb: 50,
    knowledgebaseArticles: 50,
    savedReplies: 25,
    forms: 5,
    teams: 3,
  },
  professional: {
    ticketsPerMonth: 5000,
    storageMb: 10000,
    emailAttachmentsMb: 200,
    knowledgebaseArticles: 500,
    savedReplies: 100,
    forms: 20,
    teams: 10,
  },
  enterprise: {
    ticketsPerMonth: -1,
    storageMb: 100000,
    emailAttachmentsMb: 1000,
    knowledgebaseArticles: -1,
    savedReplies: -1,
    forms: -1,
    teams: -1,
  },
} as const;

export async function seedPlans() {
  console.log("Seeding subscription plans...");

  for (const plan of SUBSCRIPTION_PLANS) {
    console.log(`  Seeding plan: ${plan.slug}...`);
  }

  console.log("Plan seeding complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
