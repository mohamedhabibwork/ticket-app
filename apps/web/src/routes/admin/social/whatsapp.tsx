import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Loader2, MessageCircle, ArrowLeft, RefreshCw, CheckCircle, ExternalLink, Phone } from "lucide-react";
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

export const Route = createFileRoute("/admin/social/whatsapp")({
  component: WhatsAppConnectionRoute,
});

function WhatsAppConnectionRoute() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  const { data: accounts, isLoading, refetch } = useQuery(
    orpc.socialAccounts.list.queryOptions({
      organizationId: 1,
      platform: "whatsapp",
    })
  );

  const connectMutation = useMutation(
    orpc.socialAccounts.connectWhatsApp.mutationOptions({
      onSuccess: () => {
        refetch();
        setPhoneNumberId("");
        setAccessToken("");
        setBusinessAccountId("");
        setShowManualForm(false);
      },
    })
  );

  const disconnectMutation = useMutation(
    orpc.socialAccounts.disconnect.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const handleManualConnect = () => {
    if (!phoneNumberId || !accessToken) return;
    connectMutation.mutate({
      organizationId: 1,
      phoneNumberId,
      accessToken,
      businessAccountId: businessAccountId || undefined,
    });
  };

  const connectedAccounts = accounts?.filter(a => a.isActive) || [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/social/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Social Accounts
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-green-100 p-3">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp</h1>
            <p className="text-muted-foreground">Connect WhatsApp Business API for customer messaging</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>WhatsApp Business API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : connectedAccounts.length > 0 ? (
              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {account.platformUsername || "WhatsApp Number"}
                        </p>
                        <p className="text-xs text-muted-foreground">Connected {formatRelativeTime(account.updatedAt)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectMutation.mutate({ id: account.id, organizationId: 1 })}
                      disabled={disconnectMutation.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No WhatsApp numbers connected</p>
              </div>
            )}

            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 mt-2 list-decimal list-inside space-y-1">
                <li>Create a WhatsApp Business Account</li>
                <li>Set up a Meta Business App</li>
                <li>Add phone numbers to your WhatsApp Business</li>
                <li>Generate a permanent access token</li>
              </ol>
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
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>Required for incoming messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-2">Webhook URL</p>
              <code className="text-xs break-all">{`${window.location.origin}/api/webhooks/whatsapp`}</code>
            </div>
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-2">Verify Token</p>
              <code className="text-xs">Your verification token will appear here</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure this URL in your Meta Business App to receive incoming messages and status updates.
            </p>
          </CardContent>
        </Card>
      </div>

      {showManualForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manual WhatsApp Setup</CardTitle>
            <CardDescription>Enter your WhatsApp Business API credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                placeholder="Enter your Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAccountId">Business Account ID (Optional)</Label>
              <Input
                id="businessAccountId"
                placeholder="Enter Business Account ID"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Enter your permanent access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>
            <Button
              onClick={handleManualConnect}
              disabled={!phoneNumberId || !accessToken || connectMutation.isPending}
              className="w-full"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Connect WhatsApp
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Numbers</CardTitle>
          <CardDescription>Your WhatsApp Business phone numbers</CardDescription>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length > 0 ? (
            <div className="space-y-4">
              {connectedAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-100 p-2">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {account.platformUsername || "WhatsApp Number"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{account.platformAccountId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnectMutation.mutate({ id: account.id, organizationId: 1 })}
                      disabled={disconnectMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${disconnectMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No WhatsApp numbers connected</p>
              <p className="text-sm">Use Manual Setup above to connect</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
