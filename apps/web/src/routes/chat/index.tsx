import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Loader2, Send, Phone, MessageSquare, Clock, User } from "lucide-react";

import { orpc } from "@/utils/orpc";

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(date).toLocaleDateString();
}

export const Route = createFileRoute("/chat/")({
  component: ChatDashboardRoute,
});

function ChatDashboardRoute() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: sessionsLoading }: any = useQuery(
    orpc.chatSessions.list.queryOptions({
      organizationId: 1,
      limit: 50,
    }) as any,
  );

  const { data: selectedSession }: any = useQuery(
    orpc.chatSessions.get.queryOptions(
      { organizationId: 1, id: selectedSessionId! },
      { enabled: !!selectedSessionId },
    ) as any,
  );

  const sendMessage = useMutation(orpc.chatMessages.createFromAgent.mutationOptions() as any);

  const assignAgent = useMutation(orpc.chatSessions.assignAgent.mutationOptions() as any);

  const endSession = useMutation(orpc.chatSessions.updateStatus.mutationOptions() as any);

  const activeSessions = sessions?.filter(
    (s: any) => s.status === "waiting" || s.status === "active",
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedSessionId) return;

    await sendMessage.mutateAsync({
      sessionId: selectedSessionId,
      agentId: 1,
      body: messageText.trim(),
    } as any);

    setMessageText("");
    queryClient.invalidateQueries(
      orpc.chatSessions.get.queryOptions({ organizationId: 1, id: selectedSessionId }) as any,
    );
  };

  const handleAcceptChat = async (sessionId: number) => {
    await assignAgent.mutateAsync({
      id: sessionId,
      organizationId: 1,
      agentId: 1,
    } as any);
    setSelectedSessionId(sessionId);
  };

  const handleEndChat = async () => {
    if (!selectedSessionId) return;
    await endSession.mutateAsync({
      id: selectedSessionId,
      organizationId: 1,
      status: "ended",
      endedBy: "agent",
    } as any);
    setSelectedSessionId(null);
  };

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Live Chats</h2>
          <p className="text-sm text-muted-foreground">{activeSessions?.length || 0} active</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeSessions && activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedSessionId === session.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">
                    {session.contact
                      ? `${session.contact.firstName} ${session.contact.lastName}`
                      : "Anonymous"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      session.status === "waiting"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(session.startedAt)}
                </div>
                {session.status === "waiting" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptChat(session.id);
                    }}
                    className="mt-2 w-full text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90"
                  >
                    Accept Chat
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active chats</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {selectedSession.contact
                      ? `${selectedSession.contact.firstName} ${selectedSession.contact.lastName}`
                      : "Anonymous"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {selectedSession.contact?.phone || "No phone"}
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    Started {formatRelativeTime(selectedSession.startedAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleEndChat}
                className="text-sm bg-destructive/10 text-destructive px-3 py-1.5 rounded hover:bg-destructive/20"
              >
                End Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedSession.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.authorType === "agent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.authorType === "agent"
                        ? "bg-primary text-primary-foreground"
                        : msg.authorType === "system"
                          ? "bg-yellow-100 text-yellow-800 text-center text-sm"
                          : "bg-muted"
                    }`}
                  >
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

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border bg-background"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a chat to view</p>
              <p className="text-sm">Or accept a waiting chat from the left</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-72 border-l p-4">
        <h3 className="font-semibold mb-4">Session Info</h3>
        {selectedSession ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <p className="text-sm font-medium capitalize">{selectedSession.status}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pre-chat Data</label>
              <div className="mt-1 space-y-1">
                {selectedSession.preChatData &&
                Object.keys(selectedSession.preChatData).length > 0 ? (
                  Object.entries(selectedSession.preChatData).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-muted-foreground">{key}:</span> {String(value)}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No pre-chat data</p>
                )}
              </div>
            </div>
            {selectedSession.agent && (
              <div>
                <label className="text-xs text-muted-foreground">Agent</label>
                <p className="text-sm font-medium">
                  {selectedSession.agent.firstName} {selectedSession.agent.lastName}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a session to view details</p>
        )}
      </div>
    </div>
  );
}
