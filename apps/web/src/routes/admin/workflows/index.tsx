import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Input } from "@ticket-app/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { Badge } from "@ticket-app/ui/components/badge";
import { orpc } from "@/utils/orpc";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  FileText,
  Search,
  Filter,
  Zap,
} from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  ticket_created: "Ticket Created",
  ticket_updated: "Ticket Updated",
  ticket_status_changed: "Status Changed",
  ticket_priority_changed: "Priority Changed",
  ticket_assigned: "Ticket Assigned",
  sla_breached: "SLA Breached",
  time_elapsed: "Time Elapsed",
};

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

export const Route = createFileRoute("/admin/workflows/")({
  component: WorkflowListRoute,
});

function WorkflowListRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    data: workflows,
    isLoading,
    _refetch,
  } = useQuery({
    queryKey: ["workflows", triggerFilter, statusFilter],
    queryFn: () =>
      orpc.workflows.list.queryOptions({
        organizationId: 1,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      }),
  });

  const deleteMutation = useMutation(
    orpc.workflows.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
      },
    }),
  );

  const toggleActiveMutation = useMutation(
    orpc.workflows.toggleActive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
      },
    }),
  );

  const handleDelete = (workflowId: number, workflowName: string) => {
    if (
      confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)
    ) {
      deleteMutation.mutate({ id: workflowId, organizationId: 1 });
    }
  };

  const handleToggleActive = (workflowId: number, currentStatus: boolean) => {
    toggleActiveMutation.mutate({
      id: workflowId,
      organizationId: 1,
      isActive: !currentStatus,
    });
  };

  const filteredWorkflows = workflows?.filter((workflow) => {
    const matchesSearch =
      searchQuery === "" ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrigger = triggerFilter === "all" || workflow.trigger === triggerFilter;
    return matchesSearch && matchesTrigger;
  });

  const handleEditWorkflow = (workflowId: number) => {
    navigate({ to: "/admin/workflows/builder", search: { workflowId } });
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Automate your support workflow with triggers and actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/workflows/builder">
              <Zap className="mr-2 h-4 w-4" />
              Open Builder
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/workflows/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={triggerFilter} onValueChange={setTriggerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trigger type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="ticket_created">Ticket Created</SelectItem>
              <SelectItem value="ticket_updated">Ticket Updated</SelectItem>
              <SelectItem value="ticket_status_changed">Status Changed</SelectItem>
              <SelectItem value="ticket_priority_changed">Priority Changed</SelectItem>
              <SelectItem value="ticket_assigned">Ticket Assigned</SelectItem>
              <SelectItem value="sla_breached">SLA Breached</SelectItem>
              <SelectItem value="time_elapsed">Time Elapsed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredWorkflows && filteredWorkflows.length > 0 ? (
        <div className="grid gap-4">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-full p-2 ${
                      workflow.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{workflow.name}</h3>
                      <Badge variant={workflow.isActive ? "default" : "secondary"}>
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {workflow.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_LABELS[workflow.trigger] || workflow.trigger}
                        </Badge>
                      </span>
                      <span>{workflow.conditions?.rules?.length || 0} conditions</span>
                      <span>{workflow.actions?.length || 0} actions</span>
                      {workflow.lastExecutedAt && (
                        <span>Last run: {formatRelativeTime(workflow.lastExecutedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(workflow.id!, workflow.isActive)}
                      title={workflow.isActive ? "Deactivate" : "Activate"}
                    >
                      {workflow.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditWorkflow(workflow.id!)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/workflows/${workflow.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/workflows/${workflow.id}/logs`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Logs
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(workflow.id!, workflow.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery || triggerFilter !== "all" || statusFilter !== "all"
                ? "No workflows match your filters"
                : "No workflows found"}
            </p>
            <Link to="/admin/workflows/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
