import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import {
  Loader2,
  Plus,
  Settings,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { orpc } from "@/utils/orpc";

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

const platformIcons: Record<string, React.ElementType> = {
  shopify: ShoppingBag,
  woocommerce: ShoppingBag,
  salla: ShoppingBag,
  zid: ShoppingBag,
};

const platformNames: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  salla: "Salla",
  zid: "Zid",
};

const platformColors: Record<string, string> = {
  shopify: "bg-green-100 text-green-600",
  woocommerce: "bg-purple-100 text-purple-600",
  salla: "bg-blue-100 text-blue-600",
  zid: "bg-orange-100 text-orange-600",
};

export const Route = createFileRoute("/admin/ecommerce/")({
  component: EcommerceStoresRoute,
});

function EcommerceStoresRoute() {
  const {
    data: stores,
    isLoading,
    refetch,
  } = useQuery(
    (orpc as any).ecommerceStores.list.queryOptions({
      organizationId: 1,
    }),
  ) as any;

  const disconnectMutation = useMutation(
    (orpc as any).ecommerceStores.disconnect.mutationOptions({
      onSuccess: () => refetch(),
    }),
  ) as any;

  const syncMutation = useMutation(
    (orpc as any).ecommerceStores.syncNow.mutationOptions({
      onSuccess: () => refetch(),
    }),
  ) as any;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "synced":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Synced
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            <AlertCircle className="h-3 w-3" />
            {status || "Unknown"}
          </span>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">eCommerce Stores</h1>
          <p className="text-muted-foreground">Manage your online store integrations</p>
        </div>
        <Link to="/admin/ecommerce/connect">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Connect Store
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : stores && stores.length > 0 ? (
        <div className="space-y-4">
          {(stores as any).map((store: any) => {
            const Icon = platformIcons[store.platform] || ShoppingBag;
            const colorClass = platformColors[store.platform] || "bg-muted";
            return (
              <Card key={store.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-2 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{store.name}</h3>
                        {getStatusBadge(store.syncStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {store.shopDomain || store.domain}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Platform: {platformNames[store.platform] || store.platform}</span>
                        <span>
                          Last sync:{" "}
                          {store.lastSyncAt ? formatRelativeTime(store.lastSyncAt) : "Never"}
                        </span>
                        {store.syncError && (
                          <span className="text-red-600">Error: {store.syncError}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to="/admin/ecommerce/connect">
                        <Button variant="ghost" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/admin/ecommerce/${store.id}` as any}>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => syncMutation.mutate({ id: store.id, organizationId: 1 })}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to disconnect this store?")) {
                            disconnectMutation.mutate({ id: store.id, organizationId: 1 });
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No stores connected</p>
            <Link to="/admin/ecommerce/connect">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Connect your first store
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
