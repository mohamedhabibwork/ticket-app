import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import { CreditCard, Calendar, Users, ArrowUpRight } from "lucide-react";

export default function BillingOverviewPage() {
  const { data: subscription, isLoading: subLoading } = useQuery(
    (orpc as any).subscriptions.get.queryOptions({ organizationId: 1 }),
  ) as any;

  const { data: paymentMethods } = useQuery(
    (orpc as any).paymentMethods.list.queryOptions({ organizationId: 1 }),
  ) as any;

  const { data: _plans } = useQuery(
    (orpc as any).subscriptions.getAvailablePlans.queryOptions(),
  ) as any;

  if (subLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const defaultPayment = paymentMethods?.find((m: any) => m.isDefault);
  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "N/A";

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    past_due: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800",
    trialing: "bg-blue-100 text-blue-800",
    paused: "bg-gray-100 text-gray-800",
  };

  const planLimits: Record<
    string,
    { agents: number; mailboxes: number; forms: number; ecommerce: number }
  > = {
    free: { agents: 3, mailboxes: 1, forms: 1, ecommerce: 0 },
    starter: { agents: 10, mailboxes: 3, forms: 5, ecommerce: 1 },
    professional: { agents: 50, mailboxes: 10, forms: -1, ecommerce: 5 },
    enterprise: { agents: -1, mailboxes: -1, forms: -1, ecommerce: -1 },
  };

  const currentLimits = subscription?.plan?.slug
    ? planLimits[subscription.plan.slug] || planLimits.free
    : planLimits.free;

  const seatUsage = subscription?.agentCount || 0;
  const seatLimit = subscription?.maxAgents || currentLimits.agents;
  const isUnlimitedSeats = seatLimit === -1;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Overview</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription, seats, and billing</p>
        </div>
        {subscription && (
          <Badge
            variant={subscription.status === "active" ? "default" : "secondary"}
            className={statusColors[subscription.status] || ""}
          >
            {subscription.status?.toUpperCase() || "N/A"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Plan
            </CardTitle>
            <Badge variant="secondary">{subscription?.plan?.name || "Free"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription?.billingCycle === "annual" ? (
                <>${((Number(subscription?.plan?.priceYearly) || 0) / 100).toFixed(0)}/yr</>
              ) : (
                <>${((Number(subscription?.plan?.priceMonthly) || 0) / 100).toFixed(0)}/mo</>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.billingCycle === "annual" ? "Annual billing" : "Monthly billing"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seat Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {seatUsage} {isUnlimitedSeats ? "" : `/ ${seatLimit}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isUnlimitedSeats ? "Unlimited agents" : `${seatLimit - seatUsage} seats available`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Billing Date
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextBillingDate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.cancelAtPeriodEnd ? "Cancels at period end" : "Auto-renews"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Method
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {defaultPayment ? (
                <span className="text-sm">
                  {defaultPayment.brand || "Card"} ****{defaultPayment.last4}
                </span>
              ) : (
                <span className="text-sm">No card on file</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {defaultPayment ? "Default payment" : "Add a payment method"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={"/billing/upgrade" as any} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                Upgrade Plan
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={"/billing/seats" as any} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                Manage Seats
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={"/billing/invoices" as any} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                View Invoices
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={"/billing/payment-methods" as any} className="w-full">
              <Button variant="outline" className="w-full justify-between">
                Payment Methods
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Agents</span>
                <span className="text-sm font-medium">
                  {currentLimits.agents === -1 ? "Unlimited" : currentLimits.agents}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Mailboxes</span>
                <span className="text-sm font-medium">
                  {currentLimits.mailboxes === -1 ? "Unlimited" : currentLimits.mailboxes}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Forms</span>
                <span className="text-sm font-medium">
                  {currentLimits.forms === -1 ? "Unlimited" : currentLimits.forms}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">eCommerce Stores</span>
                <span className="text-sm font-medium">
                  {currentLimits.ecommerce === -1 ? "Unlimited" : currentLimits.ecommerce}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
