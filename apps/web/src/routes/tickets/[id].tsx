import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Loader2,
  ArrowLeft,
  Lock,
  Unlock,
  Forward,
  Languages,
  Calendar,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@ticket-app/ui/components/dialog";
import { toast } from "sonner";

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
  const organizationId = 1;

  const [translatingMessageId, setTranslatingMessageId] = useState<number | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [calendarDescription, setCalendarDescription] = useState("");
  const [calendarDuration, setCalendarDuration] = useState(30);
  const [showDeletedThreads, setShowDeletedThreads] = useState(false);
  const [showOmitDialog, setShowOmitDialog] = useState(false);
  const [omitMessageId, setOmitMessageId] = useState<number | null>(null);
  const [omitReason, setOmitReason] = useState("");

  const { data: ticket, isLoading }: any = useQuery(
    orpc.tickets.getTimeline.queryOptions({
      id: ticketId,
      includePrivate: true,
    }) as any,
  );

  const { data: translationConfig }: any = useQuery(
    orpc.translation.getConfig.queryOptions({
      organizationId,
    }) as any,
  );

  const { data: calendarConnections }: any = useQuery(
    orpc.calendar.listConnections.queryOptions({
      userId: 1,
    }) as any,
  );

  const lockMutation = useMutation(
    orpc.tickets.lock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }) as any,
        );
      },
    }) as any,
  );

  const unlockMutation = useMutation(
    orpc.tickets.unlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }) as any,
        );
      },
    }) as any,
  );

  const lockThreadMutation = useMutation(
    orpc.ticketMessages.lockThread.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }) as any,
        );
        toast.success("Thread locked");
      },
      onError: (error: any) => {
        toast.error(`Failed to lock thread: ${error.message}`);
      },
    }) as any,
  );

  const unlockThreadMutation = useMutation(
    orpc.ticketMessages.unlockThread.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }) as any,
        );
        toast.success("Thread unlocked");
      },
      onError: (error: any) => {
        toast.error(`Failed to unlock thread: ${error.message}`);
      },
    }) as any,
  );

  const omitThreadMutation = useMutation(
    orpc.ticketMessages.omitThread.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }) as any,
        );
        toast.success("Thread omitted");
        setShowOmitDialog(false);
        setOmitMessageId(null);
        setOmitReason("");
      },
      onError: (error: any) => {
        toast.error(`Failed to omit thread: ${error.message}`);
      },
    }) as any,
  );

  const translateMutation = useMutation(
    orpc.translation.translateText.mutationOptions({
      onSuccess: (data: any, variables: any) => {
        setTranslatedMessages((prev) => ({
          ...prev,
          [variables.messageId]: data.translatedText,
        }));
        setTranslatingMessageId(null);
      },
      onError: (error: any) => {
        toast.error(`Translation failed: ${error.message}`);
        setTranslatingMessageId(null);
      },
    }) as any,
  );

  const createCalendarEventMutation = useMutation(
    orpc.calendar.createCalendarEvent.mutationOptions({
      onSuccess: () => {
        toast.success("Calendar event created");
        setShowCalendarModal(false);
        setCalendarTitle("");
        setCalendarDescription("");
        setCalendarDuration(30);
      },
      onError: (error: any) => {
        toast.error(`Failed to create event: ${error.message}`);
      },
    }) as any,
  );

  const handleLock = () => {
    lockMutation.mutate({ id: ticketId, lockedBy: 1 } as any);
  };

  const handleUnlock = () => {
    unlockMutation.mutate({ id: ticketId } as any);
  };

  const handleLockThread = (messageId: number) => {
    lockThreadMutation.mutate({ id: messageId, lockedBy: 1 } as any);
  };

  const handleUnlockThread = (messageId: number) => {
    unlockThreadMutation.mutate({ id: messageId } as any);
  };

  const handleOmitThread = () => {
    if (!omitMessageId || !omitReason.trim()) {
      toast.error("Please provide a reason for omitting this thread");
      return;
    }
    omitThreadMutation.mutate({ id: omitMessageId, reason: omitReason, omittedBy: 1 } as any);
  };

  const handleTranslate = (messageId: number, text: string) => {
    if (!translationConfig) {
      toast.error("Translation not configured. Please configure translation in settings.");
      return;
    }
    setTranslatingMessageId(messageId);
    const targetLang = translationConfig.targetLanguage || "en";
    translateMutation.mutate({
      organizationId,
      text,
      sourceLang: "auto",
      targetLang,
    } as any);
  };

  const handleCreateCalendarEvent = () => {
    const activeConnection = calendarConnections?.[0];
    if (!activeConnection) {
      toast.error("No calendar connection. Please connect your calendar in settings.");
      return;
    }
    createCalendarEventMutation.mutate({
      ticketId,
      agentCalendarConnectionId: activeConnection.id,
      title: calendarTitle || `Ticket #${ticketId}: ${ticket?.subject}`,
      description: calendarDescription || `Follow up on ticket: ${ticket?.subject}`,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + calendarDuration * 60 * 1000).toISOString(),
    } as any);
  };

  const isFromAmazon = ticket?.channel?.name === "amazon_seller";

  const visibleMessages =
    ticket?.messages?.filter((msg: any) => {
      if (msg.deletedAt && !showDeletedThreads) return false;
      return true;
    }) || [];

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
              {ticket.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeletedThreads(!showDeletedThreads)}
          >
            {showDeletedThreads ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showDeletedThreads ? "Hide Deleted" : "Show Deleted"}
          </Button>
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
              {visibleMessages.length > 0 ? (
                visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.isPrivate
                        ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                        : message.isLocked
                          ? "bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
                          : message.deletedAt
                            ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 opacity-60"
                            : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {message.isPrivate && (
                          <span className="inline-flex items-center rounded border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-600">
                            Internal Note
                          </span>
                        )}
                        {message.isLocked && (
                          <span className="inline-flex items-center rounded border border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-600">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </span>
                        )}
                        {message.deletedAt && (
                          <span className="inline-flex items-center rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-600">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Omitted: {message.deletedReason || "No reason"}
                          </span>
                        )}
                        <span className="text-sm font-medium">
                          {message.authorFirstName} {message.authorLastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(message.createdAt)}
                        </span>
                      </div>
                      {!message.deletedAt && (
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm">
                              <span className="sr-only">Actions</span>
                              <span className="text-xs">•••</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {translationConfig && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleTranslate(
                                    message.id,
                                    message.bodyText || message.bodyHtml || "",
                                  )
                                }
                                disabled={translatingMessageId === message.id}
                              >
                                <Languages className="h-4 w-4 mr-2" />
                                Translate
                              </DropdownMenuItem>
                            )}
                            {message.isLocked ? (
                              <DropdownMenuItem onClick={() => handleUnlockThread(message.id)}>
                                <Unlock className="h-4 w-4 mr-2" />
                                Unlock Thread
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleLockThread(message.id)}>
                                <Lock className="h-4 w-4 mr-2" />
                                Lock Thread
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setOmitMessageId(message.id);
                                setShowOmitDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Omit Thread
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.bodyHtml || message.bodyText || "",
                      }}
                    />
                    {translatedMessages[message.id] && (
                      <div className="mt-3 p-3 rounded border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Languages className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">
                            Translated ({translationConfig?.targetLanguage?.toUpperCase() || "EN"})
                          </span>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {translatedMessages[message.id]}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No messages yet</p>
              )}

              {ticket.forwards && ticket.forwards.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Forward className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Forwarded Emails
                    </span>
                  </div>
                  <div className="space-y-3">
                    {ticket.forwards.map((forward) => (
                      <div
                        key={forward.id}
                        className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                              <Forward className="h-3 w-3 mr-1" />
                              Forwarded
                            </span>
                            <span className="text-sm font-medium">
                              {forward.creatorFirstName} {forward.creatorLastName}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(forward.createdAt)}
                          </span>
                        </div>
                        {forward.subject && (
                          <p className="text-sm font-medium mb-1">{forward.subject}</p>
                        )}
                        <div className="text-xs text-muted-foreground mb-2">
                          To: {Array.isArray(forward.to) ? forward.to.join(", ") : forward.to}
                          {forward.cc && Array.isArray(forward.cc) && forward.cc.length > 0 && (
                            <span> • CC: {forward.cc.join(", ")}</span>
                          )}
                        </div>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-sm"
                          dangerouslySetInnerHTML={{
                            __html: forward.body || "",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {ticket.isLocked && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  This ticket is locked for reply. Other agents cannot reply while you are working
                  on it.
                </p>
              </CardContent>
            </Card>
          )}

          {!ticket.isLocked && (
            <div className="space-y-4">
              <TicketReply
                ticketId={ticketId}
                onSuccess={() => {
                  queryClient.invalidateQueries(
                    orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }),
                  );
                }}
              />
              <TicketNote
                ticketId={ticketId}
                onSuccess={() => {
                  queryClient.invalidateQueries(
                    orpc.tickets.getTimeline.queryOptions({ id: ticketId, includePrivate: true }),
                  );
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
                <p className="text-sm">{formatRelativeTime(ticket.createdAt)}</p>
              </div>
              {ticket.firstResponseAt && (
                <div>
                  <p className="text-sm text-muted-foreground">First Response</p>
                  <p className="text-sm">{formatRelativeTime(ticket.firstResponseAt)}</p>
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
                          {follower.firstName?.[0]}
                          {follower.lastName?.[0]}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setCalendarTitle(`Ticket #${ticketId}: ${ticket?.subject}`);
                  setCalendarDescription(`Follow up on ticket: ${ticket?.subject}`);
                  setShowCalendarModal(true);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Create Calendar Event
              </Button>
            </CardContent>
          </Card>

          {isFromAmazon && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Amazon Response SLA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      72-Hour Response Window
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Amazon requires sellers to respond to buyer messages within 72 hours.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ticket Created</span>
                    <span className="text-sm font-medium">
                      {ticket.createdAt ? formatRelativeTime(ticket.createdAt) : "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SLA Deadline</span>
                    <span className="text-sm font-medium text-amber-600">
                      {ticket.createdAt
                        ? new Date(
                            new Date(ticket.createdAt).getTime() + 72 * 60 * 60 * 1000,
                          ).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="calendarTitle">Event Title</Label>
              <Input
                id="calendarTitle"
                value={calendarTitle}
                onChange={(e) => setCalendarTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendarDescription">Description</Label>
              <Input
                id="calendarDescription"
                value={calendarDescription}
                onChange={(e) => setCalendarDescription(e.target.value)}
                placeholder="Event description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendarDuration">Duration (minutes)</Label>
              <Input
                id="calendarDuration"
                type="number"
                value={calendarDuration}
                onChange={(e) => setCalendarDuration(Number(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCalendarEvent}
              disabled={createCalendarEventMutation.isPending}
            >
              {createCalendarEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOmitDialog} onOpenChange={setShowOmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Omit Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will hide this thread from the conversation. Please provide a reason for the
              audit log.
            </p>
            <div className="space-y-2">
              <Label htmlFor="omitReason">Reason *</Label>
              <Input
                id="omitReason"
                value={omitReason}
                onChange={(e) => setOmitReason(e.target.value)}
                placeholder="e.g., Contains sensitive information, Wrong thread, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOmitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOmitThread}
              disabled={omitThreadMutation.isPending || !omitReason.trim()}
              variant="destructive"
            >
              {omitThreadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Omit Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
