import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Loader2, Mail, RefreshCw, Settings, Route as RouteIcon, Play, AlertCircle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
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

export const Route = createFileRoute("/admin/mailboxes/id/")({
  component: MailboxDetailRoute,
});

function MailboxDetailRoute() {
  const { id } = useParams({ from: "/admin/mailboxes/$id" });
  const mailboxId = Number(id);

  const { data: mailbox, isLoading, refetch } = useQuery(
    orpc.mailboxes.get.queryOptions({
      id: mailboxId,
    })
  );

  const syncMutation = useMutation(
    orpc.mailboxes.sync.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const testConnectionMutation = useMutation(
    orpc.mailboxes.testConnection.mutationOptions({
      onSuccess: () => refetch(),
    })
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            Error
          </span>
        );
      case "syncing":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            <AlertCircle className="h-3 w-3" />
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!mailbox) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Mailbox not found</p>
            <Link to="/admin/mailboxes/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mailboxes
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
        <Link to="/admin/mailboxes/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mailboxes
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-muted p-3">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{mailbox.name}</h1>
                {getStatusBadge(mailbox.status)}
              </div>
              <p className="text-muted-foreground font-mono">{mailbox.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Created: {new Date(mailbox.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/mailboxes/$id/configure" params={{ id }}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </Link>
            <Link to="/admin/mailboxes/$id/routing" params={{ id }}>
              <Button variant="outline">
                <RouteIcon className="mr-2 h-4 w-4" />
                Routing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync Statistics</CardTitle>
            <CardDescription>Email synchronization metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Emails</span>
              <span className="font-medium">{mailbox.stats?.totalEmails ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Synced Today</span>
              <span className="font-medium">{mailbox.stats?.syncedToday ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="font-medium">
                {mailbox.lastSyncedAt ? formatRelativeTime(mailbox.lastSyncedAt) : "Never"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Connection Type</span>
              <span className="font-medium">{mailbox.connectionType}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Errors</CardTitle>
            <CardDescription>Latest synchronization issues</CardDescription>
          </CardHeader>
          <CardContent>
            {mailbox.syncErrors && mailbox.syncErrors.length > 0 ? (
              <div className="space-y-3">
                {mailbox.syncErrors.slice(0, 5).map((error: { id: number; message: string; occurredAt: string }, index: number) => (
                  <div key={error.id || index} className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950/20">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(error.occurredAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-600" />
                <p className="text-sm">No recent errors</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            onClick={() => syncMutation.mutate({ id: mailboxId })}
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
            onClick={() => testConnectionMutation.mutate({ id: mailboxId })}
            disabled={testConnectionMutation.isPending}
          >
            {testConnectionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
