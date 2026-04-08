import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Loader2 } from "lucide-react";

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

export const Route = createFileRoute("/tickets/")({
  component: TicketsIndexRoute,
});

function TicketsIndexRoute() {
  const { data: tickets, isLoading } = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId: 1,
      limit: 50,
    })
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Manage and respond to customer tickets</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} to="/tickets/$id" params={{ id: String(ticket.id) }}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
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
                        {ticket.status && (
                          <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {ticket.status.label}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {ticket.contact && (
                          <span>
                            {ticket.contact.firstName} {ticket.contact.lastName}
                          </span>
                        )}
                        <span>
                          {formatRelativeTime(ticket.createdAt)}
                        </span>
                        {ticket.assignedAgent && (
                          <span>Assigned to {ticket.assignedAgent.firstName}</span>
                        )}
                      </div>
                    </div>
                    {ticket.channel && (
                      <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium">
                        {ticket.channel.label}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tickets found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}