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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2, ArrowLeft, ShoppingBag, CheckCircle, XCircle } from "lucide-react";
import { orpc } from "@/utils/orpc";

type Platform = "shopify" | "woocommerce" | "salla" | "zid";

const platforms: { id: Platform; name: string; icon: string; color: string }[] = [
  { id: "shopify", name: "Shopify", icon: "🟢", color: "border-green-500" },
  { id: "woocommerce", name: "WooCommerce", icon: "🟣", color: "border-purple-500" },
  { id: "salla", name: "Salla", icon: "🔵", color: "border-blue-500" },
  { id: "zid", name: "Zid", icon: "🟠", color: "border-orange-500" },
];

export const Route = createFileRoute("/admin/ecommerce/connect")({
  component: ConnectStoreRoute,
});

function ConnectStoreRoute() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [storeUrl, setStoreUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(true);

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlatform || !storeUrl) return;

      switch (selectedPlatform) {
        case "shopify":
          return orpc.ecommerceStores.connectShopify.mutate({
            organizationId: 1,
            storeUrl,
            accessToken: apiKey,
          });
        case "woocommerce":
          return orpc.ecommerceStores.connectWooCommerce.mutate({
            organizationId: 1,
            storeUrl,
            consumerKey: apiKey,
            consumerSecret: apiSecret,
          });
        case "salla":
          return orpc.ecommerceStores.connectSalla.mutate({
            organizationId: 1,
            storeUrl,
            accessToken: apiKey,
          });
        case "zid":
          return orpc.ecommerceStores.connectZid.mutate({
            organizationId: 1,
            storeUrl,
            accessToken: apiKey,
          });
      }
    },
    onSuccess: () => {
      // Redirect to store list
      window.location.href = "/admin/ecommerce";
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would call a test endpoint
      // For now, we'll simulate a test
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { success: true };
    },
  });

  const getPlatformConfig = (platform: Platform) => {
    switch (platform) {
      case "shopify":
        return {
          title: "Shopify Store",
          description: "Connect your Shopify store using your Admin API access token",
          fields: [
            {
              id: "storeUrl",
              label: "Store URL",
              placeholder: "myshopify.com",
              help: "Enter your Shopify store domain without https://",
            },
            {
              id: "apiKey",
              label: "Admin API Access Token",
              placeholder: "shpat_xxxxx",
              help: "Create an app in Shopify Admin > Apps > Develop apps",
            },
          ],
          authType: "access_token",
        };
      case "woocommerce":
        return {
          title: "WooCommerce Store",
          description: "Connect your WooCommerce store using REST API keys",
          fields: [
            {
              id: "storeUrl",
              label: "Store URL",
              placeholder: "https://mysite.com",
              help: "Enter your WooCommerce store URL",
            },
            {
              id: "apiKey",
              label: "Consumer Key",
              placeholder: "ck_xxxxx",
              help: "Generate keys in WooCommerce > Settings > Advanced > REST API",
            },
            {
              id: "apiSecret",
              label: "Consumer Secret",
              placeholder: "cs_xxxxx",
              help: "Your consumer secret",
            },
          ],
          authType: "api_keys",
        };
      case "salla":
        return {
          title: "Salla Store",
          description: "Connect your Salla store using OAuth or API token",
          fields: [
            {
              id: "storeUrl",
              label: "Store URL",
              placeholder: "myshop.salla.sa",
              help: "Enter your Salla store domain",
            },
            {
              id: "apiKey",
              label: "Access Token",
              placeholder: "Your Salla access token",
              help: "Get from Salla Partner Portal",
            },
          ],
          authType: "access_token",
        };
      case "zid":
        return {
          title: "Zid Store",
          description: "Connect your Zid store using OAuth or API token",
          fields: [
            {
              id: "storeUrl",
              label: "Store URL",
              placeholder: "myshop.zid.sa",
              help: "Enter your Zid store domain",
            },
            {
              id: "apiKey",
              label: "Access Token",
              placeholder: "Your Zid access token",
              help: "Get from Zid Developer Portal",
            },
          ],
          authType: "access_token",
        };
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/ecommerce/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stores
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Connect Store</h1>
            <p className="text-muted-foreground">Add a new eCommerce platform connection</p>
          </div>
        </div>
      </div>

      {!selectedPlatform ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Platform</CardTitle>
            <CardDescription>Choose your eCommerce platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors hover:border-primary ${platform.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <p className="font-medium">{platform.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{getPlatformConfig(selectedPlatform).title}</CardTitle>
                  <CardDescription>
                    {getPlatformConfig(selectedPlatform).description}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedPlatform(null)}>
                  Change Platform
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {getPlatformConfig(selectedPlatform).fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    id={field.id}
                    type={field.id === "apiSecret" || field.id === "apiKey" ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={
                      field.id === "storeUrl"
                        ? storeUrl
                        : field.id === "apiKey"
                          ? apiKey
                          : apiSecret
                    }
                    onChange={(e) => {
                      if (field.id === "storeUrl") setStoreUrl(e.target.value);
                      else if (field.id === "apiKey") setApiKey(e.target.value);
                      else if (field.id === "apiSecret") setApiSecret(e.target.value);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data to Sync</CardTitle>
              <CardDescription>Select what data to import from your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Orders</p>
                  <p className="text-xs text-muted-foreground">
                    Sync order data and status updates
                  </p>
                </div>
                <Checkbox
                  checked={syncOrders}
                  onCheckedChange={(checked) => setSyncOrders(checked as boolean)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Products</p>
                  <p className="text-xs text-muted-foreground">
                    Sync product catalog and inventory
                  </p>
                </div>
                <Checkbox
                  checked={syncProducts}
                  onCheckedChange={(checked) => setSyncProducts(checked as boolean)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Customers</p>
                  <p className="text-xs text-muted-foreground">
                    Sync customer profiles and purchase history
                  </p>
                </div>
                <Checkbox
                  checked={syncCustomers}
                  onCheckedChange={(checked) => setSyncCustomers(checked as boolean)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={!storeUrl || !apiKey || testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={!storeUrl || !apiKey || connectMutation.isPending}
              className="flex-1"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Connect Store
                </>
              )}
            </Button>
          </div>

          {testConnectionMutation.isSuccess && (
            <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 text-sm">
              <CheckCircle className="inline mr-2 h-4 w-4" />
              Connection successful! Your store is ready to connect.
            </div>
          )}

          {testConnectionMutation.isError && (
            <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 text-sm">
              <XCircle className="inline mr-2 h-4 w-4" />
              Connection failed. Please check your credentials and try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
