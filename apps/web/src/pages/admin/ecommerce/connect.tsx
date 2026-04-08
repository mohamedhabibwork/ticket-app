import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../../../utils/orpc";
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface EcommerceStore {
  id: number;
  uuid: string;
  platform: string;
  name: string;
  domain: string | null;
  shopDomain: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  region: string | null;
  createdAt: string;
}

interface EcommerceConnectPageProps {
  organizationId: number;
}

type Platform = "shopify" | "woocommerce" | "salla" | "zid";

const platformConfig: Record<
  Platform,
  {
    name: string;
    color: string;
    docsUrl: string;
    description: string;
    fields: Array<{ key: string; label: string; type: string; placeholder: string }>;
  }
> = {
  shopify: {
    name: "Shopify",
    color: "bg-green-600 hover:bg-green-700",
    docsUrl: "https://shopify.dev/docs/api",
    description: "Connect your Shopify store to sync orders and customers",
    fields: [
      { key: "shopDomain", label: "Shop Domain", type: "text", placeholder: "your-store.myshopify.com" },
      { key: "accessToken", label: "Admin API Access Token", type: "password", placeholder: "shpat_xxxxx" },
    ],
  },
  woocommerce: {
    name: "WooCommerce",
    color: "bg-purple-600 hover:bg-purple-700",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    description: "Connect your WooCommerce store via REST API",
    fields: [
      { key: "shopDomain", label: "Store URL", type: "text", placeholder: "https://your-store.com" },
      { key: "accessToken", label: "Consumer Key", type: "password", placeholder: "ck_xxxxx" },
      { key: "refreshToken", label: "Consumer Secret", type: "password", placeholder: "cs_xxxxx" },
    ],
  },
  salla: {
    name: "Salla",
    color: "bg-orange-500 hover:bg-orange-600",
    docsUrl: "https://docs.salla.dev/",
    description: "Connect your Salla store (Saudi eCommerce platform)",
    fields: [
      { key: "shopDomain", label: "Store URL", type: "text", placeholder: "your-store.salla.site" },
      { key: "accessToken", label: "API Token", type: "password", placeholder: "Your Salla API token" },
    ],
  },
  zid: {
    name: "Zid",
    color: "bg-pink-600 hover:bg-pink-700",
    docsUrl: "https://developer.zid.com/",
    description: "Connect your Zid store (Saudi eCommerce platform)",
    fields: [
      { key: "shopDomain", label: "Store URL", type: "text", placeholder: "your-store.zid.me" },
      { key: "accessToken", label: "API Token", type: "password", placeholder: "Your Zid API token" },
    ],
  },
};

export function EcommerceConnectPage({ organizationId }: EcommerceConnectPageProps) {
  const [showAddModal, setShowAddModal] = useState<Platform | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: stores = [], isLoading, refetch } = useQuery({
    queryKey: ["ecommerce-stores", organizationId],
    queryFn: () =>
      orpc.ecommerceStores.list.query({
        organizationId,
        limit: 50,
      }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      platform: string;
      name: string;
      shopDomain: string;
      accessTokenEnc: string;
      refreshTokenEnc?: string;
      region?: string;
    }) => {
      return await orpc.ecommerceStores.create.mutate({
        organizationId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-stores", organizationId] });
      setShowAddModal(null);
      setFormData({});
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (storeId: number) => {
      return await orpc.ecommerceStores.delete.mutate({
        id: storeId,
        organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-stores", organizationId] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (storeId: number) => {
      return await orpc.ecommerceStores.refresh.mutate({
        id: storeId,
        organizationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-stores", organizationId] });
    },
  });

  const handleSubmit = (platform: Platform) => {
    const config = platformConfig[platform];
    const name = formData.name || `${config.name} Store`;
    const accessToken = formData.accessToken || formData[platform === "woocommerce" ? "accessToken" : "accessToken"] || "";

    if (!accessToken || !formData.shopDomain) {
      setError("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      platform,
      name,
      shopDomain: formData.shopDomain,
      accessTokenEnc: accessToken,
      refreshTokenEnc: formData.refreshToken,
      region: formData.region,
    });
  };

  const getSyncStatusBadge = (store: EcommerceStore) => {
    if (store.syncStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
          <CheckCircle className="w-3 h-3" />
          Synced
        </span>
      );
    }
    if (store.syncStatus === "running") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing
        </span>
      );
    }
    if (store.syncStatus === "error") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
          <XCircle className="w-3 h-3" />
          Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
        Idle
      </span>
    );
  };

  const platformColors: Record<string, string> = {
    shopify: "bg-green-100 text-green-800",
    woocommerce: "bg-purple-100 text-purple-800",
    salla: "bg-orange-100 text-orange-800",
    zid: "bg-pink-100 text-pink-800",
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          eCommerce Connections
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your online stores to view customer orders directly in support tickets.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(platformConfig) as Platform[]).map((platform) => {
            const config = platformConfig[platform];
            const existingStore = stores.find(
              (s: EcommerceStore) => s.platform === platform
            );

            return (
              <div
                key={platform}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${platformColors[platform]} flex items-center justify-center font-bold text-lg`}
                    >
                      {platform[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {config.name}
                      </h3>
                      {existingStore && (
                        <span className="text-xs text-green-600">Connected</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={config.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {config.description}
                </p>

                {existingStore ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => refreshMutation.mutate(existingStore.id)}
                      disabled={refreshMutation.isPending}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-4 h-4 inline mr-1 ${
                          refreshMutation.isPending ? "animate-spin" : ""
                        }`}
                      />
                      Sync Now
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to disconnect this store?"
                          )
                        ) {
                          deleteMutation.mutate(existingStore.id);
                        }
                      }}
                      className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddModal(platform)}
                    className={`w-full px-4 py-2 text-white rounded-lg transition-colors ${config.color}`}
                  >
                    Connect {config.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {stores.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connected Stores
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stores.map((store: EcommerceStore) => (
                  <tr key={store.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {store.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {store.shopDomain || store.domain || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          platformColors[store.platform] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {store.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getSyncStatusBadge(store)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {store.lastSyncAt
                        ? new Date(store.lastSyncAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => refreshMutation.mutate(store.id)}
                        disabled={refreshMutation.isPending}
                        className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            refreshMutation.isPending ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect {platformConfig[showAddModal].name}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(null);
                  setFormData({});
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Store Name
                </label>
                <input
                  type="text"
                  placeholder={`${platformConfig[showAddModal].name} Store`}
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {platformConfig[showAddModal].fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [field.key]: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {(showAddModal === "salla" || showAddModal === "zid") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Region
                  </label>
                  <select
                    value={formData.region || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select region</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="AE">United Arab Emirates</option>
                    <option value="KW">Kuwait</option>
                    <option value="BH">Bahrain</option>
                    <option value="QA">Qatar</option>
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(null);
                  setFormData({});
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(showAddModal)}
                disabled={createMutation.isPending}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${platformConfig[showAddModal].color} disabled:opacity-50`}
              >
                {createMutation.isPending ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
