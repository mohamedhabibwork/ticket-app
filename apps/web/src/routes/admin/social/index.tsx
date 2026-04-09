import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Loader2, Plus, Facebook, Instagram, Twitter, MessageCircle, RefreshCw, Settings, Trash2, CheckCircle, XCircle, AlertCircle, Link as LinkIcon } from "lucide-react";
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
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  whatsapp: MessageCircle,
};

const platformNames: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter / X",
  whatsapp: "WhatsApp",
};

export const Route = createFileRoute("/admin/social/")({
  component: SocialAccountsRoute,
});

function SocialAccountsRoute() {
  const { data: accounts, isLoading, refetch } = useQuery(
    orpc.socialAccounts.list.queryOptions({
      organizationId: 1,
    })
  );

  const disconnectMutation = useMutation(
    orpc.socialAccounts.disconnect.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const refreshMutation = useMutation(
    orpc.socialAccounts.refreshToken.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const getStatusBadge = (isActive: boolean, isValid?: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
          <XCircle className="h-3 w-3" />
          Disconnected
        </span>
      );
    }
    if (isValid === false) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          <AlertCircle className="h-3 w-3" />
          Token Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle className="h-3 w-3" />
        Connected
      </span>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Accounts</h1>
          <p className="text-muted-foreground">Manage your social media integrations</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/social/facebook">
            <Button variant="outline">
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </Button>
          </Link>
          <Link to="/admin/social/instagram">
            <Button variant="outline">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
            </Button>
          </Link>
          <Link to="/admin/social/twitter">
            <Button variant="outline">
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </Button>
          </Link>
          <Link to="/admin/social/whatsapp">
            <Button variant="outline">
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="space-y-4">
          {accounts.map((account) => {
            const Icon = platformIcons[account.platform] || LinkIcon;
            return (
              <Card key={account.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{account.platformUsername || platformNames[account.platform]}</h3>
                        {getStatusBadge(account.isActive)}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{platformNames[account.platform]}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Last updated: {account.updatedAt ? formatRelativeTime(account.updatedAt) : "Never"}</span>
                        {account.tokenExpiresAt && (
                          <span>Token expires: {new Date(account.tokenExpiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/social/${account.platform}`}>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refreshMutation.mutate({ id: account.id, organizationId: 1 })}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to disconnect this account?")) {
                            disconnectMutation.mutate({ id: account.id, organizationId: 1 });
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
            <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No social accounts connected</p>
            <div className="flex justify-center gap-2">
              <Link to="/admin/social/facebook">
                <Button variant="outline">
                  <Facebook className="mr-2 h-4 w-4" />
                  Connect Facebook
                </Button>
              </Link>
              <Link to="/admin/social/instagram">
                <Button variant="outline">
                  <Instagram className="mr-2 h-4 w-4" />
                  Connect Instagram
                </Button>
              </Link>
              <Link to="/admin/social/twitter">
                <Button variant="outline">
                  <Twitter className="mr-2 h-4 w-4" />
                  Connect Twitter
                </Button>
              </Link>
              <Link to="/admin/social/whatsapp">
                <Button variant="outline">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Connect WhatsApp
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
