import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Loader2, AlertTriangle, Trash2, Mail, RefreshCw } from "lucide-react";

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
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return then.toLocaleDateString();
}

export const Route = createFileRoute("/tickets/spam")({
  component: SpamQueueRoute,
});

function SpamQueueRoute() {
  const queryClient = useQueryClient();
  const organizationId = 1;

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: spamTickets, isLoading } = useQuery(
    orpc.tickets.listSpam.queryOptions({
      organizationId,
      limit: 100,
    })
  );

  const markAsNotSpamMutation = useMutation(
    orpc.tickets.markAsNotSpam.mutationOptions({
      onSuccess: () => {
        toast.success("Ticket marked as not spam");
        queryClient.invalidateQueries(orpc.tickets.listSpam.queryOptions({ organizationId }));
        queryClient.invalidateQueries(orpc.tickets.list.queryOptions({ organizationId }));
      },
      onError: (error) => {
        toast.error(`Failed to mark as not spam: ${error.message}`);
      },
    })
  );

  const deletePermanentMutation = useMutation(
    orpc.tickets.deletePermanent.mutationOptions({
      onSuccess: () => {
        toast.success("Ticket permanently deleted");
        queryClient.invalidateQueries(orpc.tickets.listSpam.queryOptions({ organizationId }));
      },
      onError: (error) => {
        toast.error(`Failed to delete ticket: ${error.message}`);
      },
    })
  );

  const handleMarkAsNotSpam = (ticketId: number) => {
    markAsNotSpamMutation.mutate({ id: ticketId, organizationId });
  };

  const handleDeletePermanent = (ticketId: number) => {
    if (window.confirm("Are you sure you want to permanently delete this ticket? This action cannot be undone.")) {
      deletePermanentMutation.mutate({ id: ticketId, organizationId });
    }
  };

  const filteredTickets = spamTickets || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold">Spam Queue</h1>
        </div>
        <p className="text-muted-foreground">
          Review and manage tickets marked as spam
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateRange.from?.toISOString().split("T")[0] || ""}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    from: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateRange.to?.toISOString().split("T")[0] || ""}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    to: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">
                        #{ticket.referenceNumber}
                      </span>
                      {ticket.priority && (
                        <span
                          className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                          style={{
                            borderColor: ticket.priority.color,
                            color: ticket.priority.color,
                          }}
                        >
                          {ticket.priority.label}
                        </span>
                      )}
                      {ticket.channel && (
                        <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium">
                          {ticket.channel.label}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium truncate">{ticket.subject}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {ticket.contact && (
                        <span>
                          {ticket.contact.firstName} {ticket.contact.lastName}
                          {ticket.contact.email && (
                            <span className="ml-1">({ticket.contact.email})</span>
                          )}
                        </span>
                      )}
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsNotSpam(ticket.id)}
                      disabled={markAsNotSpamMutation.isPending}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Not Spam
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePermanent(ticket.id)}
                      disabled={deletePermanentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
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
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No spam tickets found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tickets marked as spam will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
