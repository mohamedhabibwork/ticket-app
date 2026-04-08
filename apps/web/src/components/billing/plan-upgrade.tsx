import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../../utils/orpc";

interface Plan {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxAgents: number;
  planFeatures?: Array<{ feature: string; enabled: boolean }>;
}

interface PlanUpgradeProps {
  currentPlan: Plan | null;
  availablePlans: Plan[];
  onSuccess?: () => void;
}

export function PlanUpgrade({ currentPlan, availablePlans, onSuccess }: PlanUpgradeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const queryClient = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: async ({ planId }: { planId: number }) => {
      return await orpc.subscriptions.create.mutate({
        organizationId: 1,
        planId,
        billingCycle,
        seatCount: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ planId }: { planId: number }) => {
      return await orpc.subscriptions.update.mutate({
        organizationId: 1,
        planId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const planIcons: Record<string, string> = {
    free: "🚀",
    starter: "⚡",
    professional: "👑",
    enterprise: "🏢",
  };

  const getCurrentPlanIndex = () => {
    if (!currentPlan) return -1;
    return availablePlans.findIndex((p) => p.slug === currentPlan.slug);
  };

  const handleUpgrade = (planId: number) => {
    if (currentPlan) {
      updateMutation.mutate({ planId });
    } else {
      upgradeMutation.mutate({ planId });
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {currentPlan ? "Change Plan" : "Subscribe"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-gray-500 mb-6">
              Select the plan that best fits your team's needs
            </p>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded ${
                  billingCycle === "monthly"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Annual
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  Save 20%
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {availablePlans.map((plan, index) => {
                const icon = planIcons[plan.slug] || "📦";
                const currentIndex = getCurrentPlanIndex();
                const isCurrentPlan = currentPlan?.id === plan.id;
                const isDowngrade = index < currentIndex;
                const isUpgrade = index > currentIndex && currentIndex >= 0;

                return (
                  <div
                    key={plan.id}
                    className={`relative border rounded-lg p-4 ${
                      isCurrentPlan
                        ? "border-blue-500 ring-2 ring-blue-500/20"
                        : "border-gray-200"
                    }`}
                  >
                    {isCurrentPlan && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Current
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{icon}</span>
                      <h3 className="font-semibold">{plan.name}</h3>
                    </div>

                    <div className="mb-4">
                      <span className="text-2xl font-bold">
                        ${((billingCycle === "annual"
                          ? Number(plan.priceYearly) / 100
                          : Number(plan.priceMonthly) / 100) / 12).toFixed(0)}
                      </span>
                      <span className="text-gray-500">/month</span>
                      <p className="text-xs text-gray-500 mt-1">
                        {billingCycle === "annual"
                          ? `$${(Number(plan.priceYearly) / 100).toFixed(0)} billed annually`
                          : `$${(Number(plan.priceMonthly) / 100).toFixed(0)} billed monthly`}
                      </p>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {plan.description || "No description"}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="text-sm">
                        <span className="font-medium">{plan.maxAgents}</span>{" "}
                        <span className="text-gray-500">
                          {plan.maxAgents === -1 ? "agents (unlimited)" : "agents"}
                        </span>
                      </div>
                    </div>

                    {plan.planFeatures && plan.planFeatures.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {plan.planFeatures
                          .filter((f) => f.enabled)
                          .slice(0, 4)
                          .map((feature, i) => (
                            <li key={i} className="flex items-center text-xs">
                              <span className="text-green-500 mr-1">✓</span>
                              {feature.feature}
                            </li>
                          ))}
                      </ul>
                    )}

                    <button
                      className={`w-full py-2 rounded ${
                        isCurrentPlan
                          ? "bg-gray-100 cursor-not-allowed"
                          : isDowngrade
                            ? "bg-gray-100 hover:bg-gray-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                      disabled={isCurrentPlan || upgradeMutation.isPending}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : isDowngrade
                          ? "Downgrade"
                          : isUpgrade
                            ? "Upgrade"
                            : "Select"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
