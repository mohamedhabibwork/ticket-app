import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Loader2, GitMerge, ArrowUpRight } from "lucide-react";

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

export const Route = createFileRoute("/tickets/merged")({
  component: MergedTicketsRoute,
});

function MergedTicketsRoute() {
  const organizationId = 1;

  const { data: mergedTickets, isLoading } = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId,
      limit: 100,
    }),
  );

  const isMergedTickets = mergedTickets?.filter((t) => t.isMerged) || [];

  const mergedGroups = isMergedTickets.reduce(
    (acc, ticket) => {
      const masterId = ticket.parentTicketId;
      if (masterId) {
        if (!acc[masterId]) {
          acc[masterId] = [];
        }
        acc[masterId].push(ticket);
      }
      return acc;
    },
    {} as Record<number, typeof isMergedTickets>,
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <GitMerge className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Merged Tickets</h1>
        </div>
        <p className="text-muted-foreground">View tickets that have been merged together</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isMergedTickets.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(mergedGroups).map(([masterId, tickets]) => {
            const masterTicket = tickets[0];
            return (
              <Card key={masterId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Master Ticket</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{masterTicket.referenceNumber}
                        </span>
                        <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {masterTicket.status?.label || "Unknown"}
                        </span>
                      </div>
                    </div>
                    <Link to="/tickets/$id" params={{ id: masterId }}>
                      <Button variant="outline" size="sm">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        View Master
                      </Button>
                    </Link>
                  </div>
                  {masterTicket.subject && <p className="text-sm mt-2">{masterTicket.subject}</p>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Merged Tickets ({tickets.length})
                    </p>
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between rounded border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <GitMerge className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
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
                            </div>
                            <p className="text-sm mt-0.5">{ticket.subject}</p>
                            {ticket.contact && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {ticket.contact.firstName} {ticket.contact.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Merged {formatRelativeTime(ticket.updatedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GitMerge className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No merged tickets</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tickets that are merged together will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
