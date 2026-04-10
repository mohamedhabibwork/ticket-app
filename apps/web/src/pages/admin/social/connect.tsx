import { useState } from "react";
import { Facebook, Twitter, MessageCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface SocialAccount {
  id: number;
  platform: string;
  platformUsername: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SocialConnectPageProps {
  organizationId: number;
}

type Platform = "facebook" | "instagram" | "twitter" | "whatsapp";

const platformConfig: Record<
  Platform,
  { name: string; icon: typeof Facebook; color: string; scopes: string }
> = {
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600 hover:bg-blue-700",
    scopes:
      "pages_read_engagement, pages_manage_messages, instagram_basic, instagram_manage_messages",
  },
  instagram: {
    name: "Instagram",
    icon: Facebook,
    color: "bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 hover:opacity-90",
    scopes: "instagram_basic, instagram_manage_messages, instagram_manage_comments",
  },
  twitter: {
    name: "Twitter / X",
    icon: Twitter,
    color: "bg-black hover:bg-gray-800",
    scopes: "tweet.read, dm.read, dm.write, follows.read, offline.access",
  },
  whatsapp: {
    name: "WhatsApp Business",
    icon: MessageCircle,
    color: "bg-green-500 hover:bg-green-600",
    scopes: "WhatsApp Business API access",
  },
};

export function SocialConnectPage({ organizationId }: SocialConnectPageProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState<SocialAccount | null>(null);

  const _fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/social-accounts?organizationId=${organizationId}`);
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const connectAccount = async (platform: Platform) => {
    setConnecting(platform);
    try {
      const response = await fetch("/api/social-accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, platform }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate connection");
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnecting(null);
    }
  };

  const disconnectAccount = async (account: SocialAccount) => {
    try {
      const response = await fetch(`/api/social-accounts/${account.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedBy: undefined }),
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setShowDisconnectModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  const toggleAccountActive = async (account: SocialAccount) => {
    try {
      const response = await fetch(`/api/social-accounts/${account.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });

      if (!response.ok) throw new Error("Failed to update account");

      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isActive: !a.isActive } : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    }
  };

  const getStatusBadge = (account: SocialAccount) => {
    if (account.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
          <CheckCircle className="w-3 h-3" />
          Connected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
        <XCircle className="w-3 h-3" />
        Disconnected
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Social Media Connections
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your social media accounts to receive and respond to messages from your customers.
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
            const Icon = config.icon;
            const existingAccount = accounts.find((a) => a.platform === platform);

            return (
              <div
                key={platform}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${config.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{config.name}</h3>
                    {existingAccount && getStatusBadge(existingAccount)}
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Required permissions: {config.scopes}
                </p>

                {existingAccount ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAccountActive(existingAccount)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {existingAccount.isActive ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => setShowDisconnectModal(existingAccount)}
                      className="flex-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => connectAccount(platform)}
                    disabled={connecting !== null}
                    className={`w-full px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${config.color}`}
                  >
                    {connecting === platform ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting...
                      </span>
                    ) : (
                      `Connect ${config.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {accounts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connected Accounts
          </h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Connected
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map((account) => {
                  const config = platformConfig[account.platform as Platform];
                  const Icon = config?.icon || Facebook;

                  return (
                    <tr key={account.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {account.platform}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {account.platformUsername || "—"}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(account)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setShowDisconnectModal(account)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Disconnect Account
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to disconnect this {showDisconnectModal.platform} account? You
              will stop receiving messages from this account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => disconnectAccount(showDisconnectModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
