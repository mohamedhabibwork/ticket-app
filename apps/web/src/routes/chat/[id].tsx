import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  Loader2,
  ArrowLeft,
  Send,
  StickyNote,
  Ticket,
  Star,
  Clock,
  User,
  Phone,
} from "lucide-react";

import {
  useChatSession,
  useSendChatMessage,
  useEndChatSession,
  useRateChatSession,
} from "@/hooks/chat";
import { formatRelativeTime } from "@ticket-app/ui/hooks/datetime";
import { orpc } from "@/utils/orpc";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/chat/id")({
  loader: async ({ context }) => {
    return context.orpc.chat.session.queryOptions({ organizationId: getCurrentOrganizationId()! });
  },
  component: ChatConversationRoute,
});

function ChatConversationRoute() {
  const { id }: any = Route.useParams();
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const sessionId = Number(id);

  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [rating, setRating] = useState<number>(0);

  const { data: session, isLoading } = useChatSession({ organizationId, id: sessionId });

  const sendMessageMutation = useSendChatMessage();
  const endSessionMutation = useEndChatSession();
  const rateSessionMutation = useRateChatSession();

  const addNoteMutation = toast.promise(
    (async () => {
      if (!noteText.trim()) return;
      await (orpc as any).chatMessages.createFromAgent.mutate({
        sessionId,
        agentId: 1,
        body: noteText.trim(),
        isInternal: true,
      });
      setNoteText("");
    })(),
    {
      success: "Note added",
      error: (e) => `Failed to add note: ${e.message}`,
    },
  );

  const convertToTicketMutation = (() => {
    const mutation = (orpc as any).tickets.create.mutationOptions({
      onSuccess: (data: any) => {
        toast.success("Ticket created from chat");
        navigate({ to: "/tickets/id", params: { id: String(data.id) } });
      },
      onError: (error: any) => {
        toast.error(`Failed to create ticket: ${error.message}`);
      },
    });
    return { mutate: mutation.mutate, mutateAsync: mutation.mutateAsync, isPending: false };
  })();

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({
      sessionId,
      agentId: 1,
      body: messageText.trim(),
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation();
  };

  const handleEndChat = () => {
    if (confirm("Are you sure you want to end this chat?")) {
      endSessionMutation.mutate({
        id: sessionId,
        organizationId,
        status: "ended",
        endedBy: "agent",
      });
    }
  };

  const handleRate = (ratingValue: number) => {
    setRating(ratingValue);
    rateSessionMutation.mutate({
      id: sessionId,
      rating: ratingValue,
    });
  };

  const handleConvertToTicket = () => {
    convertToTicketMutation.mutate({
      organizationId,
      subject: `Chat with ${(session as any)?.contact?.firstName || "Anonymous"}`,
      descriptionText: (session as any)?.messages
        ?.map((m: any) => `[${m.authorType}] ${m.body}`)
        .join("\n"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Chat session not found</p>
            <Link to="/chat/active">
              <Button variant="ghost" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Active Chats
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = session.status === "active" || session.status === "waiting";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={isActive ? "/chat/active" : "/chat/ended"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {session.contact
                ? `${session.contact.firstName} ${session.contact.lastName}`
                : "Anonymous"}
            </h1>
            <p className="text-muted-foreground">{isActive ? "Active Chat" : "Chat Transcript"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <Button variant="outline" onClick={handleConvertToTicket}>
                <Ticket className="h-4 w-4 mr-2" />
                Convert to Ticket
              </Button>
              <Button variant="outline" onClick={handleEndChat}>
                End Chat
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {session.contact
                      ? `${session.contact.firstName} ${session.contact.lastName}`
                      : "Anonymous"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {session.contact?.email && <span>{session.contact.email}</span>}
                    {session.contact?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {session.contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started {formatRelativeTime(session.startedAt)}
                  </div>
                  <div
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                      session.status === "active"
                        ? "bg-green-100 text-green-800"
                        : session.status === "waiting"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {session.status}
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {session.messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.authorType === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.authorType === "agent"
                          ? "bg-primary text-primary-foreground"
                          : msg.authorType === "system"
                            ? "bg-yellow-100 text-yellow-800 text-center text-sm"
                            : "bg-muted"
                      }`}
                    >
                      {msg.isInternal && (
                        <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                          <StickyNote className="h-3 w-3" />
                          Internal Note
                        </div>
                      )}
                      <p className="text-sm">{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.authorType === "agent"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {isActive && (
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {session.status === "ended" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Rate this Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => handleRate(star)} className="p-1">
                      <Star
                        className={`h-6 w-6 ${
                          star <= (rating || session.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Add Internal Note
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add a private note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleAddNote}
                disabled={!noteText.trim() || addNoteMutation.isLoading}
                className="w-full"
              >
                {addNoteMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Note
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{session.status}</p>
              </div>
              {session.agent && (
                <div>
                  <span className="text-muted-foreground">Agent</span>
                  <p className="font-medium">
                    {session.agent.firstName} {session.agent.lastName}
                  </p>
                </div>
              )}
              {session.endedAt && (
                <div>
                  <span className="text-muted-foreground">Ended</span>
                  <p className="font-medium">{formatRelativeTime(session.endedAt)}</p>
                </div>
              )}
              {session.rating && (
                <div>
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= session.rating!
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
