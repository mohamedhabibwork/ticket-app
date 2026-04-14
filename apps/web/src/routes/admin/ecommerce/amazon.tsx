import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Loader2,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useEcommerceAccounts } from "@/hooks";
import { orpc } from "@/utils/orpc";

const marketplaceOrpc = orpc as any;

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

const marketplaceRegions = [
  { id: "ATVPDKIKX0DER", name: "United States", code: "US" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", code: "MX" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK" },
  { id: "A1PA6795UKMFR9", name: "Germany", code: "DE" },
  { id: "A13V1IB3VIYBER", name: "France", code: "FR" },
  { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT" },
  { id: "A1ZVEO94LCOVL", name: "Spain", code: "ES" },
  { id: "A1805IZSGTT6HS", name: "Netherlands", code: "NL" },
  { id: "A2NODRKZP88ZB9", name: "Sweden", code: "SE" },
  { id: "A19NUQ8UP5N7H8", name: "Poland", code: "PL" },
  { id: "A1C3SO7AR9CNGP", name: "Japan", code: "JP" },
  { id: "AAHKV2O7FDIX1", name: "Singapore", code: "SG" },
  { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU" },
  { id: "A1KFYE2N808N5W", name: "Brazil", code: "BR" },
  { id: "A2VIGQ35NHC4ZE", name: "India", code: "IN" },
];

export const Route = createFileRoute("/admin/ecommerce/amazon")({
  loader: async () => {
    return {};
  },
  component: AmazonSellerCentralRoute,
});

function AmazonSellerCentralRoute() {
  const [accountName, setAccountName] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState("");
  const [spApiClientId, setSpApiClientId] = useState("");
  const [spApiClientSecret, setSpApiClientSecret] = useState("");
  const [spApiRefreshToken, setSpApiRefreshToken] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  const { data: accounts, isLoading, refetch } = useEcommerceAccounts({ organizationId });

  const amazonAccounts =
    (accounts as any[])?.filter((a: any) => a.platform === "amazon_seller") || [];

  const connectMutation = useMutation(
    (marketplaceOrpc.marketplace.connectMarketplace as any).mutationOptions({
      onSuccess: () => {
        refetch();
        setAccountName("");
        setSellerId("");
        setMarketplaceId("");
        setSpApiClientId("");
        setSpApiClientSecret("");
        setSpApiRefreshToken("");
        setShowManualForm(false);
      },
    }),
  ) as any;

  const disconnectMutation = useMutation(
    (marketplaceOrpc.marketplace.disconnect as any).mutationOptions({
      onSuccess: () => refetch(),
    }),
  ) as any;

  const handleManualConnect = () => {
    if (
      !accountName ||
      !sellerId ||
      !marketplaceId ||
      !spApiClientId ||
      !spApiClientSecret ||
      !spApiRefreshToken
    )
      return;
    connectMutation.mutate({
      organizationId,
      platform: "amazon_seller",
      accountName,
      sellerId,
      marketplaceId,
      spApiClientId,
      spApiClientSecret,
      spApiRefreshToken,
    });
  };

  const getMarketplaceName = (id: string | null) => {
    if (!id) return "Unknown";
    const marketplace = marketplaceRegions.find((m) => m.id === id);
    return marketplace ? `${marketplace.name} (${marketplace.code})` : id;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            <AlertCircle className="h-3 w-3" />
            Inactive
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            {status || "Unknown"}
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/ecommerce">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to eCommerce Stores
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-orange-100 p-3">
            <ShoppingBag className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Amazon Seller Central</h1>
            <p className="text-muted-foreground">
              Connect Amazon Seller Central for buyer-seller messaging
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Amazon Seller Central Accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : amazonAccounts.length > 0 ? (
              <div className="space-y-3">
                {amazonAccounts.map((account: any) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <ShoppingBag className="h-3 w-3" />
                          {account.accountName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getMarketplaceName(account.marketplaceId)} · Last sync:{" "}
                          {account.lastSyncedAt
                            ? formatRelativeTime(account.lastSyncedAt)
                            : "Never"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(account.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          disconnectMutation.mutate({ id: account.id, organizationId })
                        }
                        disabled={disconnectMutation.isPending}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No Amazon Seller accounts connected</p>
              </div>
            )}

            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>72-Hour SLA:</strong> Amazon requires sellers to respond to buyer messages
                within 72 hours.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                Tickets from Amazon will show an SLA countdown indicator to help you meet the
                response deadline.
              </p>
            </div>

            <Button
              onClick={() => setShowManualForm(!showManualForm)}
              className="w-full"
              variant="outline"
            >
              {showManualForm ? "Hide Manual Setup" : "Manual Setup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amazon SP-API Configuration</CardTitle>
            <CardDescription>Required for buyer-seller messaging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-2">What is Amazon SP-API?</p>
              <p className="text-xs text-muted-foreground">
                The Selling Partner API (SP-API) is a REST API that provides programmatic access to
                Amazon seller data and operations.
              </p>
            </div>
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-2">Setup Steps</p>
              <ol className="text-xs text-muted-foreground mt-2 list-decimal list-inside space-y-1">
                <li>Register as an Amazon Developer</li>
                <li>Create a Selling Partner API application</li>
                <li>Configure OAuth authorization</li>
                <li>Copy your API credentials</li>
              </ol>
            </div>
            <a
              href="https://sellercentral.amazon.com/apps/manage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Amazon Seller Central Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>

      {showManualForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connect Amazon Seller Account</CardTitle>
            <CardDescription>Enter your Amazon SP-API credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="My Amazon Store"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellerId">Seller ID</Label>
                <Input
                  id="sellerId"
                  placeholder="AXXXXXX1234567"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketplaceId">Marketplace</Label>
                <select
                  id="marketplaceId"
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                  value={marketplaceId}
                  onChange={(e) => setMarketplaceId(e.target.value)}
                >
                  <option value="">Select marketplace</option>
                  {marketplaceRegions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spApiClientId">SP-API Client ID</Label>
              <Input
                id="spApiClientId"
                type="password"
                placeholder="amzn1.application-oauth2.client.xxx"
                value={spApiClientId}
                onChange={(e) => setSpApiClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spApiClientSecret">SP-API Client Secret</Label>
              <Input
                id="spApiClientSecret"
                type="password"
                placeholder="amzn1.oa2-cs.v1.xxx"
                value={spApiClientSecret}
                onChange={(e) => setSpApiClientSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spApiRefreshToken">SP-API Refresh Token</Label>
              <Input
                id="spApiRefreshToken"
                type="password"
                placeholder="Atzr|xxx"
                value={spApiRefreshToken}
                onChange={(e) => setSpApiRefreshToken(e.target.value)}
              />
            </div>
            <Button
              onClick={handleManualConnect}
              disabled={
                !accountName ||
                !sellerId ||
                !marketplaceId ||
                !spApiClientId ||
                !spApiClientSecret ||
                !spApiRefreshToken ||
                connectMutation.isPending
              }
              className="w-full"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Connect Amazon Seller Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Amazon Accounts</CardTitle>
          <CardDescription>Your Amazon Seller Central integrations</CardDescription>
        </CardHeader>
        <CardContent>
          {amazonAccounts.length > 0 ? (
            <div className="space-y-4">
              {amazonAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-orange-100 p-2">
                      <ShoppingBag className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <ShoppingBag className="h-3 w-3" />
                        {account.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Seller ID: {account.sellerId} · {getMarketplaceName(account.marketplaceId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last sync:{" "}
                        {account.lastSyncedAt ? formatRelativeTime(account.lastSyncedAt) : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(account.status)}
                    <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={false}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to disconnect this account?")) {
                          disconnectMutation.mutate({ id: account.id, organizationId });
                        }
                      }}
                      disabled={disconnectMutation.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No Amazon Seller accounts connected</p>
              <p className="text-sm">Use Manual Setup above to connect</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
