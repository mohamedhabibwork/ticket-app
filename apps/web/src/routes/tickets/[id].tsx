import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Loader2, ArrowLeft, Lock, Unlock } from "lucide-react";

import { orpc } from "@/utils/orpc";
import { TicketReply } from "@/components/ticket-reply";
import { TicketNote } from "@/components/ticket-note";

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

export const Route = createFileRoute("/tickets/id")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketId = Number(id);

  const { data: ticket, isLoading } = useQuery(
    orpc.tickets.getTimeline.queryOptions({
      id: ticketId,
      includePrivate: true,
    })
  );

  const lockMutation = useMutation(
    orpc.tickets.lock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }));
      },
    })
  );

  const unlockMutation = useMutation(
    orpc.tickets.unlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }));
      },
    })
  );

  const handleLock = () => {
    lockMutation.mutate({ id: ticketId, lockedBy: 1 });
  };

  const handleUnlock = () => {
    unlockMutation.mutate({ id: ticketId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Ticket not found</p>
            <Button variant="ghost" onClick={() => navigate({ to: "/tickets" })} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate({ to: "/tickets" })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
              {ticket.isLocked && (
                <Lock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-muted-foreground">
                #{ticket.referenceNumber}
              </span>
              {ticket.status && (
                <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {ticket.status.label}
                </span>
              )}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ticket.isLocked ? (
            <Button variant="outline" size="sm" onClick={handleUnlock}>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLock}>
              <Lock className="h-4 w-4 mr-2" />
              Lock for Reply
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.messages && ticket.messages.length > 0 ? (
                ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.isPrivate
                        ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {message.isPrivate && (
                        <span className="inline-flex items-center rounded border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Internal Note
                        </span>
                      )}
                      <span className="text-sm font-medium">
                        {message.authorFirstName} {message.authorLastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(message.createdAt)}
                      </span>
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.bodyHtml || message.bodyText || "",
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No messages yet
                </p>
              )}
            </CardContent>
          </Card>

          {ticket.isLocked && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  This ticket is locked for reply. Other agents cannot reply while you are working on it.
                </p>
              </CardContent>
            </Card>
          )}

          {!ticket.isLocked && (
            <div className="space-y-4">
              <TicketReply
                ticketId={ticketId}
                onSuccess={() => {
                  queryClient.invalidateQueries(orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }));
                }}
              />
              <TicketNote
                ticketId={ticketId}
                onSuccess={() => {
                  queryClient.invalidateQueries(orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }));
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{ticket.status?.label || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <p className="font-medium">{ticket.priority?.label || "Unknown"}</p>
              </div>
              {ticket.contact && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">
                    {ticket.contact.firstName} {ticket.contact.lastName}
                  </p>
                  {ticket.contact.email && (
                    <p className="text-sm text-muted-foreground">{ticket.contact.email}</p>
                  )}
                </div>
              )}
              {ticket.assignedAgent && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Agent</p>
                  <p className="font-medium">
                    {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}
                  </p>
                </div>
              )}
              {ticket.assignedTeam && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Team</p>
                  <p className="font-medium">{ticket.assignedTeam.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {formatRelativeTime(ticket.createdAt)}
                </p>
              </div>
              {ticket.firstResponseAt && (
                <div>
                  <p className="text-sm text-muted-foreground">First Response</p>
                  <p className="text-sm">
                    {formatRelativeTime(ticket.firstResponseAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {ticket.tags && ticket.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                      style={{
                        borderColor: tag.color || undefined,
                        color: tag.color || undefined,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ticket.followers && ticket.followers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticket.followers.map((follower) => (
                    <div key={follower.id} className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {follower.firstName?.[0]}{follower.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {follower.firstName} {follower.lastName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}