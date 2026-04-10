import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";

import {
  Loader2,
  Plus,
  Mail,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
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

export const Route = createFileRoute("/admin/mailboxes/")({
  component: MailboxListRoute,
});

function MailboxListRoute() {
  const {
    data: mailboxes,
    isLoading,
    refetch,
  } = useQuery(
    orpc.mailboxes.list.queryOptions({
      organizationId: 1,
    }),
  );

  const deleteMutation = useMutation(
    orpc.mailboxes.delete.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const syncMutation = useMutation(
    orpc.mailboxes.sync.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const testConnectionMutation = useMutation(
    orpc.mailboxes.testConnection.mutationOptions({
      onSuccess: () => refetch(),
    }),
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mailboxes</h1>
          <p className="text-muted-foreground">Manage email mailboxes for your organization</p>
        </div>
        <Link to="/admin/mailboxes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Mailbox
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : mailboxes && mailboxes.length > 0 ? (
        <div className="space-y-4">
          {mailboxes.map((mailbox) => (
            <Card key={mailbox.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-muted p-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{mailbox.name}</h3>
                      {getStatusBadge(mailbox.status)}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{mailbox.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Last synced:{" "}
                        {mailbox.lastSyncedAt ? formatRelativeTime(mailbox.lastSyncedAt) : "Never"}
                      </span>
                      {mailbox.syncError && (
                        <span className="text-red-600">Error: {mailbox.syncError}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/admin/mailboxes/$id" params={{ id: String(mailbox.id) }}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => syncMutation.mutate({ id: mailbox.id })}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => testConnectionMutation.mutate({ id: mailbox.id })}
                      disabled={testConnectionMutation.isPending}
                    >
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this mailbox?")) {
                          deleteMutation.mutate({ id: mailbox.id });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No mailboxes found</p>
            <Link to="/admin/mailboxes/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add your first mailbox
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
