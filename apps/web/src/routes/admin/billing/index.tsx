import { useQuery } from "@tanstack/react-query";
import { orpc } from "../../../utils/orpc";

export default function AdminBillingPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platformStats"],
    queryFn: () => orpc.admin.getPlatformStats.query(),
  });

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["allOrganizations"],
    queryFn: () =>
      orpc.admin.listOrganizations.query({ page: 1, limit: 100 }),
  });

  if (statsLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Billing Console</h1>
        <p className="text-gray-500 mt-1">
          Manage subscriptions, billing, and revenue across all organizations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Total Organizations
          </h3>
          <div className="text-3xl font-bold">
            {stats?.totalOrganizations || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Total Users
          </h3>
          <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Active Subscriptions
          </h3>
          <div className="text-3xl font-bold">
            {stats?.totalActiveSubscriptions || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Monthly Revenue
          </h3>
          <div className="text-3xl font-bold">
            ${((stats?.currentMRR || 0) / 100).toFixed(2)}
          </div>
          {stats?.mrrChange !== undefined && stats.mrrChange !== 0 && (
            <p
              className={`text-sm mt-1 ${
                stats.mrrChange > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.mrrChange > 0 ? "+" : ""}
              ${(stats.mrrChange / 100).toFixed(2)} from last month
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">All Organizations</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="px-6 py-3 font-medium">Organization</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations?.organizations.map((org: any) => (
                <tr key={org.id} className="border-b last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        org.status === "active"
                          ? "bg-green-100 text-green-800"
                          : org.status === "canceled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {org.createdAt
                      ? new Date(org.createdAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:underline text-sm">
                        View
                      </button>
                      <button className="text-gray-600 hover:underline text-sm">
                        Subscription
                      </button>
                      <button className="text-gray-600 hover:underline text-sm">
                        Invoices
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!organizations?.organizations ||
          organizations.organizations.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No organizations found
          </div>
        )}
      </div>
    </div>
  );
}
