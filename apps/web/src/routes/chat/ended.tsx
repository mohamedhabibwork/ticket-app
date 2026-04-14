import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Loader2, Search, Clock, Star, MessageSquare, Calendar } from "lucide-react";

import { useChatSessionsList } from "@/hooks/chat";
import { getCurrentOrganizationId } from "@/utils/auth";

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

export const Route = createFileRoute("/chat/ended")({
  loader: async ({ context }) => {
    return {
      sessions: context.orpc.chat.sessions.queryOptions({
        organizationId: getCurrentOrganizationId()!,
        limit: 50,
      }),
      agents: context.orpc.users.list.queryOptions({
        organizationId: getCurrentOrganizationId()!,
        isActive: true,
        limit: 100,
      }),
    };
  },
  component: ChatHistoryRoute,
});

function ChatHistoryRoute() {
  const { organizationId } = useOrganization();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState<number | undefined>(undefined);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);

  const loaderData = Route.useLoaderData<(typeof Route)["loader"]>();
  const { data: sessions, isLoading } = useChatSessionsList({
    organizationId,
    limit: 50,
  });

  const { data: agents }: any = useQuery(loaderData.agents as any);

  const endedSessions = sessions?.filter(
    (s: any) => s.status === "ended" || s.status === "converted",
  );

  const filteredSessions = endedSessions?.filter((session: any) => {
    if (agentFilter && session.agentId !== agentFilter) return false;
    if (ratingFilter && session.rating !== ratingFilter) return false;
    if (dateFilter) {
      const sessionDate = new Date(session.endedAt || session.startedAt);
      const filterDate = new Date(dateFilter);
      if (sessionDate.toDateString() !== filterDate.toDateString()) return false;
    }
    if (search) {
      const contactName = session.contact
        ? `${session.contact.firstName} ${session.contact.lastName}`.toLowerCase()
        : "";
      if (!contactName.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chat History</h1>
        <p className="text-muted-foreground">View past chat conversations</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by contact name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <select
                className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={agentFilter || ""}
                onChange={(e) =>
                  setAgentFilter(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">All Agents</option>
                {agents?.users?.map((agent: any) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[150px]">
              <select
                className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                value={ratingFilter || ""}
                onChange={(e) =>
                  setRatingFilter(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredSessions && filteredSessions.length > 0 ? (
        <div className="space-y-3">
          {filteredSessions.map((session: any) => (
            <Link key={session.id} to="/chat/id" params={{ id: String(session.id) }}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {session.contact
                            ? `${session.contact.firstName} ${session.contact.lastName}`
                            : "Anonymous"}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {session.agent && (
                            <span>
                              Agent: {session.agent.firstName} {session.agent.lastName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(session.endedAt || session.startedAt)}
                          </span>
                          {session.status === "converted" && (
                            <span className="text-blue-600">Converted to ticket</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {renderStars(session.rating)}
                      <Button variant="ghost" size="sm">
                        View Transcript
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">No chat sessions found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
