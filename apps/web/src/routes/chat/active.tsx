import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Loader2, Clock, User, MessageSquare, UserPlus } from "lucide-react";

import { orpc } from "@/utils/orpc";

function formatWaitTime(startedAt: Date | string): string {
  const now = new Date();
  const start = new Date(startedAt);
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`;
}

export const Route = createFileRoute("/chat/active")({
  component: ActiveChatSessionsRoute,
});

function ActiveChatSessionsRoute() {
  const queryClient = useQueryClient();
  const organizationId = 1;

  const { data: sessions, isLoading } = useQuery(
    orpc.chatSessions.getActiveSessions.queryOptions({
      organizationId,
    }),
  );

  const { data: agents } = useQuery(
    orpc.users.list.queryOptions({
      organizationId,
      isActive: true,
      limit: 100,
    }),
  );

  const assignMutation = useMutation(
    orpc.chatSessions.assignAgent.mutationOptions({
      onSuccess: () => {
        toast.success("Chat assigned successfully");
        queryClient.invalidateQueries(
          orpc.chatSessions.getActiveSessions.queryOptions({ organizationId }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to assign chat: ${error.message}`);
      },
    }),
  );

  const handleAssign = (sessionId: number, agentId: number) => {
    assignMutation.mutate({
      id: sessionId,
      organizationId,
      agentId,
    });
  };

  const waitingSessions = sessions?.filter((s) => s.status === "waiting");
  const activeSessions = sessions?.filter((s) => s.status === "active");

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Active Chats</h1>
        <p className="text-muted-foreground">Manage live chat sessions</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {waitingSessions && waitingSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Waiting ({waitingSessions.length})
              </h2>
              <div className="space-y-3">
                {waitingSessions.map((session) => (
                  <Card key={session.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {session.contact
                                ? `${session.contact.firstName} ${session.contact.lastName}`
                                : "Anonymous"}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Waiting {formatWaitTime(session.startedAt)}
                              </span>
                              {session.contact?.email && <span>{session.contact.email}</span>}
                            </div>
                            {session.preChatData && Object.keys(session.preChatData).length > 0 && (
                              <div className="mt-2 text-sm">
                                {Object.entries(session.preChatData)
                                  .slice(0, 2)
                                  .map(([key, value]) => (
                                    <span key={key} className="text-muted-foreground mr-3">
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {agents?.users?.map((agent) => (
                                <DropdownMenuItem
                                  key={agent.id}
                                  onClick={() => handleAssign(session.id, agent.id)}
                                >
                                  {agent.firstName} {agent.lastName}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button size="sm" asChild>
                            <Link to="/chat/$id" params={{ id: String(session.id) }}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeSessions && activeSessions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                Active ({activeSessions.length})
              </h2>
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <Card key={session.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {session.contact
                                ? `${session.contact.firstName} ${session.contact.lastName}`
                                : "Anonymous"}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>
                                Agent:{" "}
                                {session.agent
                                  ? `${session.agent.firstName} ${session.agent.lastName}`
                                  : "Unassigned"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatWaitTime(session.startedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" asChild>
                          <Link to="/chat/$id" params={{ id: String(session.id) }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!waitingSessions || waitingSessions.length === 0) &&
            (!activeSessions || activeSessions.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No active chat sessions</p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
