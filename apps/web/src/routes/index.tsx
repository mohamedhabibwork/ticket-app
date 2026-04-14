import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Separator } from "@ticket-app/ui/components/separator";
import {
  MessageSquare,
  Users,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Headphones,
  ArrowRight,
  Check,
  Star,
  Clock,
  Ticket,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Multi-Channel Inbox",
    description:
      "Unified inbox for email, live chat, Twitter, Facebook, Instagram, and WhatsApp conversations.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Assign tickets, tag teammates, internal notes, and resolve issues faster together.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Track response times, CSAT scores, ticket volumes, and team performance in real-time.",
  },
  {
    icon: Shield,
    title: "SLA Management",
    description:
      "Set and enforce service level agreements with automated reminders and escalation rules.",
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description:
      "Auto-assign tickets, route intelligently, and automate repetitive workflows with ease.",
  },
  {
    icon: Globe,
    title: "Customer Portal",
    description:
      "Let customers track requests with a branded self-service portal and knowledge base.",
  },
];

const STATS = [
  { label: "Tickets Resolved", value: "2M+", icon: Ticket },
  { label: "Avg Response Time", value: "<2h", icon: Clock },
  { label: "Customer Satisfaction", value: "98%", icon: Star },
  { label: "Team Efficiency", value: "3x", icon: TrendingUp },
];

const TESTIMONIALS = [
  {
    quote:
      "ticket-app transformed our support workflow. Response times dropped by 60% in the first month.",
    author: "Sarah Chen",
    role: "Head of Support, TechCorp",
    avatar: "SC",
  },
  {
    quote:
      "The multi-channel inbox is a game changer. We handle 3x more tickets with the same team size.",
    author: "Marcus Johnson",
    role: "Customer Success Manager, ScaleUp",
    avatar: "MJ",
  },
  {
    quote:
      "Best investment we made. The analytics alone helped us identify and fix bottlenecks instantly.",
    author: "Emily Rodriguez",
    role: "VP Operations, GrowthCo",
    avatar: "ER",
  },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small teams getting started",
    features: [
      "3 team members",
      "100 tickets/month",
      "Email & chat support",
      "Basic analytics",
      "Customer portal",
    ],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "For growing teams with advanced needs",
    features: [
      "Unlimited team members",
      "Unlimited tickets",
      "All integrations",
      "Advanced analytics",
      "SLA management",
      "Priority support",
    ],
    cta: "Start Free Trial",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with custom needs",
    features: [
      "Everything in Professional",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "On-premise option",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
  },
];

const FAQ_ITEMS = [
  {
    question: "How long does it take to set up?",
    answer:
      "You can be up and running in under 5 minutes. Just create an account, configure your channels, and start accepting tickets. Our migration tools also help you import existing data from other platforms.",
  },
  {
    question: "Can I import data from my current helpdesk?",
    answer:
      "Yes! We support importing from Zendesk, Freshdesk, HelpScout, and most other major helpdesk platforms. Our migration wizard guides you through the process step by step.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Absolutely. All paid plans come with a 14-day free trial with full access to all features. No credit card required to start.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual Enterprise plans.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel anytime from your account settings. You'll retain access until the end of your billing period. We also offer a 30-day money-back guarantee.",
  },
];

const LOGOS = ["Acme Corp", "TechStart", "GrowthLab", "DataFlow", "CloudNine"];

function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <LogosSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection
          items={FAQ_ITEMS}
          openIndex={openFaqIndex}
          onToggle={(index) => setOpenFaqIndex(openFaqIndex === index ? null : index)}
        />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Headphones className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-semibold text-lg" translate="no">
              ticket-app
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/kb"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Help Center
            </Link>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#footer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/portal/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/portal/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_60%,rgba(120,119,198,0.1),transparent)]" />
      </div>
      <div className="container mx-auto max-w-7xl px-4 text-center">
        <Badge variant="secondary" className="mb-6">
          <Zap className="mr-1 h-3 w-3" aria-hidden="true" />
          Now with AI-powered ticket routing
        </Badge>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
          Customer Support,
          <br className="hidden md:block" />
          <span className="text-primary">Simplified</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
          Handle tickets, chat with customers, and manage your team all in one place. Built for
          fast-growing support teams who refuse to compromise on quality.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/portal/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/portal/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View Demo
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required · 14-day free trial · Setup in 5 minutes
        </p>
      </div>
    </section>
  );
}

function LogosSection() {
  return (
    <section className="py-12 border-y bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by 10,000+ support teams worldwide
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
          {LOGOS.map((logo) => (
            <span key={logo} className="text-lg font-semibold text-muted-foreground">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Delight Customers
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powerful tools designed to help your team deliver exceptional support at scale.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="text-left">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Connect Your Channels",
      description:
        "Integrate email, chat, and social media in minutes. All conversations flow into a single unified inbox.",
    },
    {
      number: "02",
      title: "Organize & Assign",
      description:
        "Use tags, priorities, and teams to route tickets to the right people automatically.",
    },
    {
      number: "03",
      title: "Resolve & Measure",
      description:
        "Work through tickets efficiently, track SLAs, and measure performance with real-time analytics.",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Up and Running in Minutes</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three simple steps to transform your customer support.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-left">
              <div className="text-6xl font-bold text-primary/10 mb-4">{step.number}</div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 right-0 translate-x-1/2">
                  <ArrowRight className="h-6 w-6 text-primary/20" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex justify-center mb-2">
                <stat.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Support Teams Everywhere</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            See why thousands of teams choose ticket-app to power their customer support.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.author} className="text-left">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4" aria-label="5 star rating">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="text-sm mb-6">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`text-left relative ${tier.popular ? "border-primary shadow-lg" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/portal/register" className="block">
                  <Button variant={tier.variant} className="w-full">
                    {tier.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({
  items,
  openIndex,
  onToggle,
}: {
  items: typeof FAQ_ITEMS;
  openIndex: number | null;
  onToggle: (index: number) => void;
}) {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">
            Can&apos;t find the answer you&apos;re looking for?{" "}
            <Link to="/kb" className="text-primary hover:underline">
              Visit our help center
            </Link>
          </p>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index}>
              <button
                onClick={() => onToggle(index)}
                className="flex w-full items-center justify-between p-4 text-left"
                aria-expanded={openIndex === index}
              >
                <span className="font-medium pr-4">{item.question}</span>
                {openIndex === index ? (
                  <ChevronUp
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
              {openIndex === index && (
                <CardContent className="pt-0 text-muted-foreground">
                  <Separator className="mb-4" />
                  <p className="text-sm">{item.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden">
          <CardContent className="py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Support?
            </h2>
            <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8">
              Join thousands of teams using ticket-app to deliver faster, better customer support.
              Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/portal/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/portal/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Headphones className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-semibold text-lg" translate="no">
                ticket-app
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Modern customer support software for fast-growing teams.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#footer" className="hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/kb" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <Separator className="mb-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ticket-app. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/kb" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/kb" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
