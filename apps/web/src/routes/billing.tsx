import { useQuery } from "@tanstack/react-query";
import { orpc } from "../../utils/orpc";
import { PlanUpgrade } from "../../components/billing/plan-upgrade";
import { SeatManagement } from "../../components/billing/seat-management";
import { useState } from "react";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("subscription");

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => orpc.subscriptions.get.query({ organizationId: 1 }),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => orpc.invoices.list.query({ organizationId: 1, page: 1, limit: 20 }),
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => orpc.paymentMethods.list.query({ organizationId: 1 }),
  });

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: () => orpc.subscriptions.getAvailablePlans.query(),
  });

  if (subLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Subscription Found</h1>
          <p className="text-gray-500 mb-4">
            You don't have an active subscription yet.
          </p>
          <PlanUpgrade
            currentPlan={null}
            availablePlans={plans || []}
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    past_due: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800",
    trialing: "bg-blue-100 text-blue-800",
    paused: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-gray-500 mt-1">
            Manage your subscription, seats, and invoices
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[subscription.status] || "bg-gray-100"}`}>
          {subscription.status?.toUpperCase() || "N/A"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current Plan</h3>
          <div className="text-2xl font-bold">{subscription.plan?.name || "N/A"}</div>
          <p className="text-sm text-gray-500 mt-1">
            {subscription.billingCycle === "annual"
              ? `$${((Number(subscription.plan?.priceYearly) || 0) / 100).toFixed(2)}/year`
              : `$${((Number(subscription.plan?.priceMonthly) || 0) / 100).toFixed(2)}/month`}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Seats Used</h3>
          <div className="text-2xl font-bold">
            {subscription.agentCount || 0} / {subscription.maxAgents || "∞"}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {subscription.seatLimitReached
              ? "Seat limit reached"
              : `${subscription.maxAgents! - subscription.agentCount!} seats available`}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current Period</h3>
          <div className="text-sm font-medium">
            {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : "N/A"}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {subscription.cancelAtPeriodEnd
              ? "Cancels at period end"
              : "Renews automatically"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="border-b">
          <div className="flex gap-1 p-1">
            {["subscription", "seats", "invoices", "payment"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Current Plan</h3>
                  <p className="text-sm text-gray-500">
                    {subscription.plan?.description || "No description"}
                  </p>
                </div>
                <PlanUpgrade
                  currentPlan={subscription.plan}
                  availablePlans={plans || []}
                  onSuccess={() => window.location.reload()}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Billing Cycle</h3>
                  <p className="text-sm text-gray-500">
                    {subscription.billingCycle === "annual" ? "Annual" : "Monthly"}
                  </p>
                </div>
                <button className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                  Change
                </button>
              </div>

              {subscription.plan?.planFeatures && subscription.plan.planFeatures.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Features Included</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {subscription.plan.planFeatures
                      .filter((f: any) => f.enabled)
                      .map((feature: any, i: number) => (
                        <div key={i} className="flex items-center text-sm">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature.feature}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "seats" && (
            <SeatManagement
              subscription={subscription}
              onUpdate={() => window.location.reload()}
            />
          )}

          {activeTab === "invoices" && (
            <div>
              {invoicesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : invoices?.invoices && invoices.invoices.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.invoices.map((invoice: any) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{invoice.number}</td>
                        <td className="py-3">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          ${(Number(invoice.total) / 100).toFixed(2)} {invoice.currency}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button className="text-blue-600 hover:underline text-sm">
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No invoices yet
                </div>
              )}
            </div>
          )}

          {activeTab === "payment" && (
            <div>
              {paymentMethods && paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method: any) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3">
                          💳
                        </div>
                        <div>
                          <div className="font-medium">
                            {method.brand || method.type} ****{method.last4 || "****"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {method.isDefault ? "Default" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <button className="px-3 py-1 text-sm hover:bg-gray-100 rounded">
                            Set Default
                          </button>
                        )}
                        <button className="px-3 py-1 text-sm text-red-600 hover:bg-gray-100 rounded">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    💳
                  </div>
                  <p className="text-gray-500 mb-4">
                    No payment methods added yet
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Add Payment Method
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
