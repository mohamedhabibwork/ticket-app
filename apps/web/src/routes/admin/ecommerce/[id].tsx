import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, ArrowLeft, RefreshCw, Settings, Trash2, CheckCircle, XCircle, AlertCircle, ShoppingBag, Package, Users, Receipt, ExternalLink } from "lucide-react";
import { orpc } from "@/utils/orpc";

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Never";
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

const platformNames: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  salla: "Salla",
  zid: "Zid",
};

export const Route = createFileRoute("/admin/ecommerce/id/")({
  component: StoreDetailRoute,
});

function StoreDetailRoute() {
  const { id } = useParams({ from: "/admin/ecommerce/id/" });
  const storeId = Number(id);
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(true);

  const { data: store, isLoading, refetch } = useQuery(
    orpc.ecommerceStores.get.queryOptions({
      id: storeId,
      organizationId: 1,
    })
  );

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["store-orders", storeId],
    queryFn: () =>
      orpc.ecommerceStores.getOrders.query({
        id: storeId,
        organizationId: 1,
        limit: 10,
      }),
    enabled: !!store,
  });

  const syncMutation = useMutation(
    orpc.ecommerceStores.syncNow.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const disconnectMutation = useMutation(
    orpc.ecommerceStores.disconnect.mutationOptions({
      onSuccess: () => {
        window.location.href = "/admin/ecommerce";
      },
    })
  );

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

  const getOrderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Completed</span>;
      case "processing":
      case "shipped":
        return <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Processing</span>;
      case "cancelled":
      case "refunded":
        return <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Cancelled</span>;
      case "pending":
      case "awaiting":
        return <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Store not found</p>
            <Link to="/admin/ecommerce/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Stores
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/ecommerce/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stores
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-muted p-3">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{store.name}</h1>
                {getStatusBadge(store.syncStatus)}
              </div>
              <p className="text-muted-foreground font-mono">{store.shopDomain || store.domain}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Platform: {platformNames[store.platform] || store.platform} • Connected {formatRelativeTime(store.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => syncMutation.mutate({ id: storeId, organizationId: 1 })}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to disconnect this store?")) {
                  disconnectMutation.mutate({ id: storeId, organizationId: 1 });
                }
              }}
              disabled={disconnectMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Data synchronization information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="font-medium">{store.lastSyncAt ? formatRelativeTime(store.lastSyncAt) : "Never"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sync Status</span>
              <span className="font-medium">{store.syncStatus || "Not synced"}</span>
            </div>
            {store.syncError && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-950/20">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">Sync Error</p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">{store.syncError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>Configure data synchronization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Orders</span>
              </div>
              <Checkbox
                checked={syncOrders}
                onCheckedChange={(checked) => setSyncOrders(checked as boolean)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Products</span>
              </div>
              <Checkbox
                checked={syncProducts}
                onCheckedChange={(checked) => setSyncProducts(checked as boolean)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Customers</span>
              </div>
              <Checkbox
                checked={syncCustomers}
                onCheckedChange={(checked) => setSyncCustomers(checked as boolean)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from this store</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : ordersData && ordersData.length > 0 ? (
            <div className="space-y-4">
              {ordersData.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">#{order.externalOrderId || order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName || "Guest"} • {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {order.currency} {order.total?.toFixed(2)}
                    </span>
                    {getOrderStatusBadge(order.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm">Orders will appear here after the first sync</p>
            </div>
          )}
          {ordersData && ordersData.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Link to={`/admin/ecommerce/${storeId}/orders`}>
                <Button variant="outline" className="w-full">
                  View All Orders
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
