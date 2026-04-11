import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";

import { Label } from "@ticket-app/ui/components/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Filter, Loader2, ChevronDown, GripVertical, X, Eye } from "lucide-react";

import { orpc } from "@/utils/orpc";

interface TicketColumn {
  id: number;
  label: string;
  tickets: Ticket[];
}

interface Ticket {
  id: number;
  referenceNumber: string;
  subject: string;
  priority: { id: number; label: string; color: string } | null;
  status: { id: number; label: string } | null;
  channel: { id: number; label: string } | null;
  contact: { firstName: string; lastName: string; email: string } | null;
  assignedAgent: { id: number; firstName: string; lastName: string } | null;
  assignedTeam: { id: number; name: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  tagIds?: number[];
  tags?: { id: number; name: string; color: string }[];
}

const KANBAN_STATUSES = ["Open", "Pending", "On Hold", "Resolved", "Closed"];

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

export const Route = createFileRoute("/tickets/kanban")({
  component: KanbanBoardRoute,
});

function KanbanBoardRoute() {
  const queryClient = useQueryClient();
  const organizationId = 1;

  const [filters, setFilters] = useState({
    priorityIds: [] as number[],
    agentIds: [] as number[],
    teamIds: [] as number[],
    tagIds: [] as number[],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [draggedTicket, setDraggedTicket] = useState<Ticket | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const { data: allTickets, isLoading }: any = useQuery(
    orpc.tickets.list.queryOptions({
      organizationId,
      limit: 100,
    }) as any,
  );

  const { data: agents }: any = useQuery(
    orpc.users.list.queryOptions({
      organizationId,
      isActive: true,
      limit: 100,
    }) as any,
  );

  const { data: teams }: any = useQuery(
    orpc.teams.list.queryOptions({
      organizationId,
    }) as any,
  );

  const { data: _tags }: any = useQuery(
    orpc.tags.list.queryOptions({
      organizationId,
    }) as any,
  );

  const updateStatusMutation = useMutation(
    orpc.tickets.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.tickets.list.queryOptions({ organizationId }) as any);
        toast.success("Ticket status updated");
      },
      onError: (error: any) => {
        toast.error(`Failed to update status: ${error.message}`);
      },
    }) as any,
  );

  const filteredTickets =
    allTickets?.filter((ticket: any) => {
      if (
        filters.priorityIds.length > 0 &&
        ticket.priority &&
        !filters.priorityIds.includes(ticket.priority.id)
      ) {
        return false;
      }
      if (
        filters.agentIds.length > 0 &&
        ticket.assignedAgent &&
        !filters.agentIds.includes(ticket.assignedAgent.id)
      ) {
        return false;
      }
      if (
        filters.teamIds.length > 0 &&
        ticket.assignedTeam &&
        !filters.teamIds.includes(ticket.assignedTeam.id)
      ) {
        return false;
      }
      return true;
    }) || [];

  const columns: TicketColumn[] = KANBAN_STATUSES.map((status) => {
    const statusLookup = allTickets?.find(
      (t) => t.status?.label?.toLowerCase() === status.toLowerCase(),
    );
    const statusId = statusLookup?.status?.id;

    return {
      id: statusId || KANBAN_STATUSES.indexOf(status),
      label: status,
      tickets: filteredTickets.filter(
        (t) => t.status?.label?.toLowerCase() === status.toLowerCase(),
      ),
    };
  });

  const handleDragStart = (e: React.DragEvent, ticket: Ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnLabel: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnLabel);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnLabel: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedTicket && columnLookup[columnLabel]) {
      updateStatusMutation.mutate({
        id: draggedTicket.id,
        statusId: columnLookup[columnLabel],
      } as any);
    }
    setDraggedTicket(null);
  };

  const columnLookup: Record<string, number> = {};
  allTickets?.forEach((ticket: any) => {
    if (ticket.status?.label) {
      columnLookup[ticket.status.label] = ticket.status.id;
    }
  });

  const togglePriorityFilter = (priorityId: number) => {
    setFilters((prev) => ({
      ...prev,
      priorityIds: prev.priorityIds.includes(priorityId)
        ? prev.priorityIds.filter((id) => id !== priorityId)
        : [...prev.priorityIds, priorityId],
    }));
  };

  const toggleAgentFilter = (agentId: number) => {
    setFilters((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter((id) => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  const toggleTeamFilter = (teamId: number) => {
    setFilters((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const clearFilters = () => {
    setFilters({
      priorityIds: [],
      agentIds: [],
      teamIds: [],
      tagIds: [],
    });
  };

  const hasActiveFilters =
    filters.priorityIds.length > 0 ||
    filters.agentIds.length > 0 ||
    filters.teamIds.length > 0 ||
    filters.tagIds.length > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ticket Kanban Board</h1>
          <p className="text-muted-foreground">Drag tickets between columns to change status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                {filters.priorityIds.length +
                  filters.agentIds.length +
                  filters.teamIds.length +
                  filters.tagIds.length}
              </span>
            )}
          </Button>
          <Link to="/tickets/new">
            <Button size="sm">New Ticket</Button>
          </Link>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" className="w-full justify-between">
                      {filters.priorityIds.length > 0
                        ? `${filters.priorityIds.length} selected`
                        : "All priorities"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full">
                    <DropdownMenuCheckboxItem
                      checked={filters.priorityIds.includes(1)}
                      onCheckedChange={() => togglePriorityFilter(1)}
                    >
                      <span
                        className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                        style={{ borderColor: "#ef4444", color: "#ef4444" }}
                      >
                        High
                      </span>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.priorityIds.includes(2)}
                      onCheckedChange={() => togglePriorityFilter(2)}
                    >
                      <span
                        className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                        style={{ borderColor: "#f97316", color: "#f97316" }}
                      >
                        Medium
                      </span>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.priorityIds.includes(3)}
                      onCheckedChange={() => togglePriorityFilter(3)}
                    >
                      <span
                        className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium mr-2"
                        style={{ borderColor: "#22c55e", color: "#22c55e" }}
                      >
                        Low
                      </span>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" className="w-full justify-between">
                      {filters.agentIds.length > 0
                        ? `${filters.agentIds.length} selected`
                        : "All agents"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                    {agents?.users?.map((agent) => (
                      <DropdownMenuCheckboxItem
                        key={agent.id}
                        checked={filters.agentIds.includes(agent.id)}
                        onCheckedChange={() => toggleAgentFilter(agent.id)}
                      >
                        {agent.firstName} {agent.lastName}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label>Team</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" className="w-full justify-between">
                      {filters.teamIds.length > 0
                        ? `${filters.teamIds.length} selected`
                        : "All teams"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                    {teams?.map((team) => (
                      <DropdownMenuCheckboxItem
                        key={team.id}
                        checked={filters.teamIds.includes(team.id)}
                        onCheckedChange={() => toggleTeamFilter(team.id)}
                      >
                        {team.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.label}
            className={`flex-shrink-0 w-80 rounded-lg border-2 transition-colors ${
              dragOverColumn === column.label ? "border-primary bg-primary/5" : "border-transparent"
            }`}
            onDragOver={(e) => handleDragOver(e, column.label)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.label)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{column.label}</h3>
                <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                  {column.tickets.length}
                </span>
              </div>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {column.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">
                              #{ticket.referenceNumber}
                            </span>
                            {ticket.priority && (
                              <span
                                className="inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium"
                                style={{
                                  borderColor: ticket.priority.color,
                                  color: ticket.priority.color,
                                }}
                              >
                                {ticket.priority.label}
                              </span>
                            )}
                          </div>
                          <Link to="/tickets/id" params={{ id: String(ticket.id) }}>
                            <h4 className="text-sm font-medium truncate hover:underline">
                              {ticket.subject}
                            </h4>
                          </Link>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {ticket.contact && (
                                <span>
                                  {ticket.contact.firstName} {ticket.contact.lastName}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedTicket(ticket);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {column.tickets.length === 0 && (
                <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed text-muted-foreground text-sm">
                  No tickets
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ticket Details</CardTitle>
              <Button variant="ghost" size="icon-xs" onClick={() => setSelectedTicket(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    #{selectedTicket.referenceNumber}
                  </span>
                  {selectedTicket.priority && (
                    <span
                      className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                      style={{
                        borderColor: selectedTicket.priority.color,
                        color: selectedTicket.priority.color,
                      }}
                    >
                      {selectedTicket.priority.label}
                    </span>
                  )}
                  {selectedTicket.status && (
                    <span className="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {selectedTicket.status.label}
                    </span>
                  )}
                </div>
                <h3 className="font-medium">{selectedTicket.subject}</h3>
              </div>

              {selectedTicket.contact && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="text-sm">
                    {selectedTicket.contact.firstName} {selectedTicket.contact.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.contact.email}</p>
                </div>
              )}

              {selectedTicket.assignedAgent && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Agent</p>
                  <p className="text-sm">
                    {selectedTicket.assignedAgent.firstName} {selectedTicket.assignedAgent.lastName}
                  </p>
                </div>
              )}

              {selectedTicket.assignedTeam && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Team</p>
                  <p className="text-sm">{selectedTicket.assignedTeam.name}</p>
                </div>
              )}

              {selectedTicket.channel && (
                <div>
                  <p className="text-sm text-muted-foreground">Channel</p>
                  <p className="text-sm">{selectedTicket.channel.label}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatRelativeTime(selectedTicket.createdAt)}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  to="/tickets/id"
                  params={{ id: String(selectedTicket.id) }}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    View Full Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
