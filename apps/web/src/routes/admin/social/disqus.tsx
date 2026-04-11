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
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  ExternalLink,
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

export const Route = createFileRoute("/admin/social/disqus")({
  component: DisqusConnectionRoute,
});

function DisqusConnectionRoute() {
  const [forumShortname, setForumShortname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  const {
    data: accounts,
    isLoading,
    refetch,
  }: any = useQuery(
    orpc.disqus.listAccounts.queryOptions({
      organizationId: 1,
    } as any),
  );

  const connectMutation = useMutation(
    orpc.disqus.connectDisqusForum.mutationOptions({
      onSuccess: () => {
        refetch();
        setForumShortname("");
        setApiKey("");
        setApiSecret("");
        setAccessToken("");
        setShowManualForm(false);
      },
    }) as any,
  );

  const disconnectMutation = useMutation(
    orpc.disqus.disconnect.mutationOptions({
      onSuccess: () => refetch(),
    }) as any,
  );

  const testConnectionMutation = useMutation(
    orpc.disqus.testConnection.mutationOptions({
      onSuccess: () => refetch(),
    }) as any,
  );

  const handleManualConnect = () => {
    if (!forumShortname || !apiKey || !apiSecret) return;
    connectMutation.mutate({
      organizationId: 1,
      forumShortname,
      apiKey,
      apiSecret,
      accessToken: accessToken || undefined,
    } as any);
  };

  const connectedAccounts = (accounts as any)?.filter((a: any) => a.status === "active") || [];

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
          <div className="rounded-full bg-blue-100 p-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Disqus</h1>
            <p className="text-muted-foreground">Connect Disqus forum for community commenting</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Disqus Forum Integration</CardDescription>
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
                        <p className="font-medium flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          {account.forumShortname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connected {formatRelativeTime(account.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          testConnectionMutation.mutate({
                            id: account.id,
                            organizationId: 1,
                          } as any)
                        }
                        disabled={testConnectionMutation.isPending}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${testConnectionMutation.isPending ? "animate-spin" : ""}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          disconnectMutation.mutate({ id: account.id, organizationId: 1 } as any)
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
                <p className="text-muted-foreground mb-4">No Disqus forums connected</p>
              </div>
            )}

            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 mt-2 list-decimal list-inside space-y-1">
                <li>Create a Disqus account and forum</li>
                <li>Go to your forum settings</li>
                <li>Generate API credentials from the Disqus API</li>
                <li>Enter your forum shortname and API keys</li>
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
            <CardDescription>Required for incoming comments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded bg-muted">
              <p className="text-sm font-medium mb-2">Webhook URL</p>
              <code className="text-xs break-all">{`${window.location.origin}/api/webhooks/disqus`}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure this URL in your Disqus forum settings to receive incoming comments and
              moderate discussions.
            </p>
            <a
              href="https://disqus.com/admin/settings/webhooks/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Disqus Webhook Settings
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>

      {showManualForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manual Disqus Setup</CardTitle>
            <CardDescription>Enter your Disqus forum credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forumShortname">Forum Shortname</Label>
              <Input
                id="forumShortname"
                placeholder="your-forum-shortname"
                value={forumShortname}
                onChange={(e) => setForumShortname(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The shortname used in your Disqus forum URL
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Disqus API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="Enter your Disqus API secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token (Optional)</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Enter your Disqus access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for posting replies back to Disqus
              </p>
            </div>
            <Button
              onClick={handleManualConnect}
              disabled={!forumShortname || !apiKey || !apiSecret || connectMutation.isPending}
              className="w-full"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Connect Disqus Forum
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Forums</CardTitle>
          <CardDescription>Your Disqus forum integrations</CardDescription>
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
                    <div className="rounded-full bg-blue-100 p-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        {account.forumShortname}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{account.forumId}</p>
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
                        testConnectionMutation.mutate({ id: account.id, organizationId: 1 } as any)
                      }
                      disabled={testConnectionMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${testConnectionMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to disconnect this forum?")) {
                          disconnectMutation.mutate({ id: account.id, organizationId: 1 } as any);
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
              <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No Disqus forums connected</p>
              <p className="text-sm">Use Manual Setup above to connect</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
