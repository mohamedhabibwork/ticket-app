import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Loader2, ArrowUpRight, ArrowDownRight, MessageSquare, Clock, CheckCircle, AlertTriangle, Users, Plus, Search, FileText, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { useState } from "react";

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

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const Route = createFileRoute("/dashboard/")({
  component: DashboardRoute,
});

const organizationId = 1;
const currentUserId = 1;

function DashboardRoute() {
  const [showDailySummary, setShowDailySummary] = useState(false);

  const { data: openTickets, isLoading: loadingOpenTickets } = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId,
      limit: 1,
    })
  );

  const { data: myTickets, isLoading: loadingMyTickets } = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId,
      assignedAgentId: currentUserId,
      limit: 10,
    })
  );

  const { data: responseTimeData, isLoading: loadingResponseTime } = useQuery(
    orpc.reports.getResponseTime.queryOptions({
      organizationId,
    })
  );

  const { data: slaData, isLoading: loadingSla } = useQuery(
    orpc.reports.getSlaCompliance.queryOptions({
      organizationId,
    })
  );

  const { data: chatStats, isLoading: loadingChat } = useQuery(
    orpc.chatSessions.getActiveSessions.queryOptions({
      organizationId,
    })
  );

  const { data: teamMembers, isLoading: loadingTeam } = useQuery(
    orpc.users.list.queryOptions({
      organizationId,
    })
  );

  const { data: breachedSla, isLoading: loadingBreached } = useQuery(
    orpc.ticketSla.listBreached.queryOptions({
      organizationId,
    })
  );

  const { data: upcomingEvents, isLoading: loadingEvents } = useQuery(
    orpc.calendar.listAgentEvents.queryOptions({
      userId: currentUserId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  );

  const openTicketCount = openTickets?.length || 0;
  const myTicketCount = myTickets?.length || 0;
  const avgResponseMinutes = responseTimeData?.averageResponseTimeMinutes || 0;
  const csatScore = slaData ? Math.round((slaData.withinSla / (slaData.total || 1)) * 100) : 0;
  const activeChats = chatStats?.filter(c => c.status === "active").length || 0;
  const waitingChats = chatStats?.filter(c => c.status === "waiting").length || 0;
  const onlineAgents = teamMembers?.users?.filter((u: any) => u.isActive).length || 0;
  const totalAgents = teamMembers?.users?.length || 0;

  const ticketsToday = myTickets?.filter((t: any) => {
    const today = new Date();
    const ticketDate = new Date(t.createdAt);
    return ticketDate.toDateString() === today.toDateString();
  }).length || 0;

  const resolvedToday = myTickets?.filter((t: any) => {
    const today = new Date();
    const resolved = t.resolvedAt ? new Date(t.resolvedAt) : null;
    return resolved && resolved.toDateString() === today.toDateString();
  }).length || 0;

  const agentTicketCounts = teamMembers?.users?.reduce((acc: Record<number, number>, user: any) => {
    acc[user.id] = 0;
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s your daily overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOpenTickets ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-3xl font-bold">{openTicketCount}</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12% from last week
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Assigned Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMyTickets ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-3xl font-bold">{myTicketCount}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {ticketsToday} created today
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingResponseTime ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-3xl font-bold">{formatResponseTime(avgResponseMinutes)}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  First response avg
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CSAT Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSla ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="text-3xl font-bold">{csatScore}%</div>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +5% from last month
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Ticket Activity</CardTitle>
              <Link to="/tickets">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMyTickets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : myTickets && myTickets.length > 0 ? (
              <div className="space-y-3">
                {myTickets.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{ticket.referenceNumber}
                        </span>
                        {ticket.priority && (
                          <span
                            className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs"
                            style={{
                              borderColor: ticket.priority.color,
                              color: ticket.priority.color,
                            }}
                          >
                            {ticket.priority.label}
                          </span>
                        )}
                        {ticket.status && (
                          <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-xs">
                            {ticket.status.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.contact?.firstName} {ticket.contact?.lastName} · {formatRelativeTime(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link to={`/tickets/${ticket.id}`}>
                        <Button variant="outline" size="icon-xs">
                          <FileText className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tickets assigned to you
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chat Queue</CardTitle>
              <Link to="/chat">
                <Button variant="ghost" size="sm">View</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChat ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{activeChats}</div>
                      <div className="text-xs text-muted-foreground">Active Chats</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium">{waitingChats}</div>
                      <div className="text-xs text-muted-foreground">Waiting</div>
                    </div>
                  </div>
                </div>
                <Link to="/chat">
                  <Button className="w-full" variant="outline">
                    Open Chat Panel
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle>SLA Warnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBreached ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : breachedSla && breachedSla.length > 0 ? (
              <div className="space-y-3">
                {breachedSla.slice(0, 5).map((item: any) => (
                  <Link key={item.ticket.id} to={`/tickets/${item.ticket.id}`}>
                    <div className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="text-sm font-medium">#{item.ticket.referenceNumber}</div>
                        <div className="text-xs text-muted-foreground">{item.ticket.subject}</div>
                      </div>
                      <span className="text-xs text-destructive font-medium">Breached</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No SLA warnings
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <CardTitle>Team Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTeam ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : teamMembers?.users && teamMembers.users.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Team Status</span>
                  <span className="text-sm font-medium">
                    {onlineAgents} / {totalAgents} online
                  </span>
                </div>
                {teamMembers.users.slice(0, 5).map((agent: any) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {agent.firstName?.[0]}{agent.lastName?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {agent.firstName} {agent.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{agent.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          agent.isActive ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {agent.isActive ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <CardTitle>Upcoming Calendar Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.startAt
                          ? new Date(event.startAt).toLocaleString()
                          : "Unknown start time"}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No upcoming events</p>
                <p className="text-xs">Connect your calendar in settings to see events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/tickets/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </Link>
            <Link to="/tickets">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search Tickets
              </Button>
            </Link>
            <Link to="/admin/reports">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <button
            onClick={() => setShowDailySummary(!showDailySummary)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle>Daily Summary</CardTitle>
            {showDailySummary ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showDailySummary && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded border">
                <div className="text-sm text-muted-foreground mb-1">Tickets Created Today</div>
                <div className="text-2xl font-bold">{ticketsToday}</div>
              </div>
              <div className="p-4 rounded border">
                <div className="text-sm text-muted-foreground mb-1">Tickets Resolved Today</div>
                <div className="text-2xl font-bold">{resolvedToday}</div>
              </div>
              <div className="p-4 rounded border">
                <div className="text-sm text-muted-foreground mb-1">Avg Response Time Today</div>
                <div className="text-2xl font-bold">{formatResponseTime(avgResponseMinutes)}</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
