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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2, Instagram, ArrowLeft, RefreshCw, CheckCircle, ExternalLink } from "lucide-react";
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

export const Route = createFileRoute("/admin/social/instagram")({
  component: InstagramConnectionRoute,
});

function InstagramConnectionRoute() {
  const [messageToTicket, setMessageToTicket] = useState(true);

  const {
    data: accounts,
    isLoading,
    refetch,
  } = useQuery(
    orpc.socialAccounts.list.queryOptions({
      organizationId: 1,
      platform: "instagram",
    }),
  );

  const disconnectMutation = useMutation(
    orpc.socialAccounts.disconnect.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const refreshMutation = useMutation(
    orpc.socialAccounts.refreshToken.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const handleOAuthFlow = () => {
    const clientId = import.meta.env.VITE_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/admin/social/instagram/callback`;
    const scope = "instagram_basic,instagram_manage_messages,pages_read_engagement";
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  };

  const connectedAccounts = accounts?.filter((a) => a.isActive) || [];

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
          <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-3">
            <Instagram className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Instagram</h1>
            <p className="text-muted-foreground">
              Connect Instagram Business accounts for message support
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Instagram Business OAuth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : connectedAccounts.length > 0 ? (
              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">
                          @{account.platformUsername || "instagram_business"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connected {formatRelativeTime(account.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        disconnectMutation.mutate({ id: account.id, organizationId: 1 })
                      }
                      disabled={disconnectMutation.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No Instagram accounts connected</p>
              </div>
            )}
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Instagram connection requires a linked Facebook Page with
                messaging permissions enabled.
              </p>
            </div>
            <Button onClick={handleOAuthFlow} className="w-full" variant="outline">
              <Instagram className="mr-2 h-4 w-4" />
              Connect with Instagram
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure message handling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Message to Ticket</p>
                <p className="text-xs text-muted-foreground">Convert DMs to support tickets</p>
              </div>
              <Checkbox
                checked={messageToTicket}
                onCheckedChange={(checked) => setMessageToTicket(checked as boolean)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Your Instagram Business accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length > 0 ? (
            <div className="space-y-4">
              {connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-2">
                      <Instagram className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        @{account.platformUsername || "instagram_business"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {account.platformAccountId}
                      </p>
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
                      onClick={() => refreshMutation.mutate({ id: account.id, organizationId: 1 })}
                      disabled={refreshMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Instagram className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No accounts connected yet</p>
              <p className="text-sm">Click "Connect with Instagram" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
