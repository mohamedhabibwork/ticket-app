import { useQuery } from "@tanstack/react-query";
import { orpc } from "../../../utils/orpc";
import { useState } from "react";

type DateRange = "7d" | "30d" | "90d" | "12m";

export default function RevenueReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["platformStats"],
    queryFn: () => orpc.admin.getPlatformStats.query(),
  });

  const { data: organizations } = useQuery({
    queryKey: ["allOrganizations"],
    queryFn: () =>
      orpc.admin.listOrganizations.query({ page: 1, limit: 100 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const plans = ["Free", "Starter", "Professional", "Enterprise"];
  const planColors: Record<string, string> = {
    Free: "bg-gray-100 text-gray-800",
    Starter: "bg-blue-100 text-blue-800",
    Professional: "bg-purple-100 text-purple-800",
    Enterprise: "bg-amber-100 text-amber-800",
  };

  const planCounts = plans.reduce(
    (acc, plan) => {
      acc[plan] = organizations?.organizations.filter(
        (org: any) => org.plan === plan
      ).length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "12m", label: "Last 12 months" },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Revenue Reports</h1>
          <p className="text-gray-500 mt-1">
            Platform revenue metrics and subscription analytics
          </p>
        </div>

        <div className="flex gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium text-blue-100 mb-1">
            Monthly Recurring Revenue
          </h3>
          <div className="text-4xl font-bold">
            ${((stats?.currentMRR || 0) / 100).toFixed(2)}
          </div>
          {stats?.mrrChange !== undefined && stats.mrrChange !== 0 && (
            <p className="text-sm mt-2 text-blue-100">
              {stats.mrrChange > 0 ? "+" : ""}
              ${((stats.mrrChange || 0) / 100).toFixed(2)} vs last period
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium text-green-100 mb-1">
            Annual Run Rate
          </h3>
          <div className="text-4xl font-bold">
            ${(((stats?.currentMRR || 0) * 12) / 100).toFixed(2)}
          </div>
          <p className="text-sm mt-2 text-green-100">Based on current MRR</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium text-purple-100 mb-1">
            Average Revenue Per User
          </h3>
          <div className="text-4xl font-bold">
            $
            {(
              (stats?.totalUsers || 0) > 0
                ? (stats?.currentMRR || 0) / (stats?.totalUsers || 1)
                : 0
            ).toFixed(2)}
          </div>
          <p className="text-sm mt-2 text-purple-100">Per month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Revenue by Plan</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {plans.map((plan) => {
                const count = planCounts[plan] || 0;
                const percentage =
                  (organizations?.organizations?.length || 0) > 0
                    ? (count / organizations.organizations.length) * 100
                    : 0;

                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        <span className={`px-2 py-0.5 rounded text-xs ${planColors[plan]}`}>
                          {plan}
                        </span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {count} orgs ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Plan Distribution</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {plans.map((plan) => {
                const count = planCounts[plan] || 0;
                return (
                  <div
                    key={plan}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <div className="font-medium">{plan}</div>
                      <div className="text-sm text-gray-500">{count} organizations</div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        planColors[plan].split(" ")[0]
                      }`}
                    >
                      <span className="font-bold">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Organization Revenue Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="px-6 py-3 font-medium">Organization</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Est. MRR</th>
              </tr>
            </thead>
            <tbody>
              {organizations?.organizations
                .filter((org: any) => org.plan !== "Free")
                .map((org: any) => (
                  <tr key={org.id} className="border-b last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-500">{org.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          planColors[org.plan] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          org.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      $0.00
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
