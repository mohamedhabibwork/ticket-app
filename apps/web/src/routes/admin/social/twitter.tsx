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
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2, Twitter, ArrowLeft, RefreshCw, CheckCircle, ExternalLink } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { useSocialAccounts } from "@/hooks";

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

export const Route = createFileRoute("/admin/social/twitter")({
  loader: async () => {
    return {};
  },
  component: TwitterConnectionRoute,
});

function TwitterConnectionRoute() {
  const [mentionsToTicket, setMentionsToTicket] = useState(true);
  const [dmsToTicket, setDmsToTicket] = useState(true);

  const {
    data: accounts,
    isLoading,
    refetch,
  }: any = useSocialAccounts({ organizationId, platform: "twitter" });

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
    const clientId = import.meta.env.VITE_TWITTER_APP_ID;
    const redirectUri = `${window.location.origin}/admin/social/twitter/callback`;
    const scope = "tweet.read,dm.read,dm.write,offline.access";
    window.location.href = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=twitter_auth`;
  };

  const connectedAccounts = accounts?.filter((a: any) => a.isActive) || [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to={"/admin/social/" as any}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Social Accounts
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-black p-3">
            <Twitter className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Twitter / X</h1>
            <p className="text-muted-foreground">
              Connect Twitter accounts for mentions and DM support
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Twitter OAuth 2.0</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : connectedAccounts.length > 0 ? (
              <div className="space-y-3">
                {connectedAccounts.map((account: any) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">@{account.platformUsername || "twitter_user"}</p>
                        <p className="text-xs text-muted-foreground">
                          Connected {formatRelativeTime(account.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        disconnectMutation.mutate({ id: account.id, organizationId } as any)
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
                <p className="text-muted-foreground mb-4">No Twitter accounts connected</p>
              </div>
            )}
            <Button onClick={handleOAuthFlow} className="w-full" variant="outline">
              <Twitter className="mr-2 h-4 w-4" />
              Connect Twitter
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure ticket conversion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Mentions to Ticket</p>
                <p className="text-xs text-muted-foreground">Create tickets from @mentions</p>
              </div>
              <Checkbox
                checked={mentionsToTicket}
                onCheckedChange={(checked) => setMentionsToTicket(checked as boolean)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">DMs to Ticket</p>
                <p className="text-xs text-muted-foreground">Create tickets from direct messages</p>
              </div>
              <Checkbox
                checked={dmsToTicket}
                onCheckedChange={(checked) => setDmsToTicket(checked as boolean)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Your Twitter / X account connections</CardDescription>
        </CardHeader>
        <CardContent>
          {connectedAccounts.length > 0 ? (
            <div className="space-y-4">
              {connectedAccounts.map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-black p-2">
                      <Twitter className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">@{account.platformUsername || "twitter_user"}</p>
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
                      onClick={() =>
                        refreshMutation.mutate({ id: account.id, organizationId } as any)
                      }
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
              <Twitter className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No accounts connected yet</p>
              <p className="text-sm">Click "Connect Twitter" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
