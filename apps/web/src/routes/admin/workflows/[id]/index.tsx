import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Badge } from "@ticket-app/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { orpc } from "@/utils/orpc";
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  FileText,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  GitBranch,
  Hammer,
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

const ACTION_LABELS: Record<string, string> = {
  assign_agent: "Assign Agent",
  assign_team: "Assign Team",
  set_priority: "Set Priority",
  set_status: "Set Status",
  add_tags: "Add Tags",
  remove_tags: "Remove Tags",
  send_email: "Send Email",
  send_webhook: "Send Webhook",
  create_task: "Create Task",
  add_note: "Add Note",
  apply_saved_reply: "Apply Saved Reply",
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleString();
}

export const Route = createFileRoute("/admin/workflows/id/")({
  component: WorkflowDetailRoute,
});

function WorkflowDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workflowId = Number(id);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () =>
      orpc.workflows.get.queryOptions({
        id: workflowId,
        organizationId: 1,
      }),
  });

  const { data: logs } = useQuery({
    queryKey: ["workflow-logs", workflowId],
    queryFn: () =>
      orpc.workflows.getExecutionLogs.queryOptions({
        workflowId,
        organizationId: 1,
        limit: 5,
      }),
  });

  const toggleActiveMutation = useMutation(
    orpc.workflows.toggleActive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
      },
    })
  );

  const handleToggleActive = () => {
    if (!workflow) return;
    toggleActiveMutation.mutate({
      id: workflowId,
      organizationId: 1,
      isActive: !workflow.isActive,
    });
  };

  const handleEdit = () => {
    navigate({ to: "/admin/workflows/builder", search: { workflowId } });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Workflow not found</p>
            <Link to="/admin/workflows">
              <Button variant="outline" className="mt-4">
                Back to Workflows
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <Link
          to="/admin/workflows"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflows
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${
                workflow.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{workflow.name}</h1>
                <Badge variant={workflow.isActive ? "default" : "secondary"}>
                  {workflow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {workflow.description || "No description"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToggleActive}
              disabled={toggleActiveMutation.isPending}
            >
              {workflow.isActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trigger</p>
                  <p className="font-medium">
                    {TRIGGER_LABELS[workflow.trigger] || workflow.trigger}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conditions</p>
                  <p className="font-medium">
                    {workflow.conditions?.rules?.length || 0} rules (
                    {workflow.conditions?.operator?.toUpperCase() || "AND"})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Hammer className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actions</p>
                  <p className="font-medium">
                    {workflow.actions?.length || 0} actions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="history">Recent History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{formatDate(workflow.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                  <p className="text-sm">{formatDate(workflow.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Executed</p>
                  <p className="text-sm">{formatDate(workflow.lastExecutedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Executions</p>
                  <p className="text-sm">{workflow.executionCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>
                Rules that determine when this workflow should run
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflow.conditions?.rules?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>No conditions defined. This workflow will run for all matching triggers.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">Match {workflow.conditions?.operator?.toUpperCase()}</Badge>
                  </div>
                  {workflow.conditions?.rules?.map((rule: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">
                        {rule.field} {rule.operator} "{rule.value}"
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                What happens when the workflow conditions are met
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflow.actions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>No actions defined. Add actions in the workflow builder.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflow.actions.map((action: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      <Badge variant="secondary">
                        {ACTION_LABELS[action.type] || action.type}
                      </Badge>
                      <code className="flex-1 text-sm bg-muted px-2 py-1 rounded text-xs overflow-hidden text-ellipsis">
                        {JSON.stringify(action.params)}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Executions</CardTitle>
                  <CardDescription>Last 5 workflow executions</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/workflows/${workflowId}/logs`}>
                    <FileText className="mr-2 h-4 w-4" />
                    View All Logs
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!logs || logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2" />
                  <p>No executions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        {log.error ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Ticket #{log.ticketId}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.trigger}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(log.executedAt)} · {log.durationMs}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
