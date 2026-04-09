import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Badge } from "@ticket-app/ui/components/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { orpc } from "@/utils/orpc";
import {
  ArrowLeft,
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Zap,
} from "lucide-react";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString();
}

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

export const Route = createFileRoute("/admin/workflows/id/logs")({
  component: WorkflowLogsRoute,
});

function WorkflowLogsRoute() {
  const { id } = Route.useParams();
  const workflowId = Number(id);

  const [searchQuery, setSearchQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  const { data: workflow } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () =>
      orpc.workflows.get.queryOptions({
        id: workflowId,
        organizationId: 1,
      }),
  });

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ["workflow-logs", workflowId, currentPage],
    queryFn: () =>
      orpc.workflows.getExecutionLogs.queryOptions({
        workflowId,
        organizationId: 1,
        limit: pageSize,
        offset: currentPage * pageSize,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["workflow-log-stats", workflowId],
    queryFn: () =>
      orpc.workflowLogs.getStats.queryOptions({
        organizationId: 1,
        workflowId,
      }),
  });

  const filteredLogs = logsData?.filter((log: any) => {
    const matchesSearch =
      searchQuery === "" ||
      String(log.ticketId).includes(searchQuery);
    const matchesResult =
      resultFilter === "all" ||
      (resultFilter === "success" && !log.error) ||
      (resultFilter === "failure" && log.error);
    return matchesSearch && matchesResult;
  });

  const toggleExpand = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
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
            <div className="rounded-full bg-primary/10 p-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{workflow?.name || "Workflow"} Logs</h1>
              <p className="text-muted-foreground">
                Execution history and debugging information
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? `animate-spin` : ``}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Executions</div>
            <div className="text-2xl font-bold mt-1">
              {stats?.totalExecutions || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Successful</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {stats?.successfulExecutions || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold mt-1 text-red-600">
              {stats?.failedExecutions || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avg Duration</div>
            <div className="text-2xl font-bold mt-1">
              {stats?.avgDurationMs || 0}ms
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full mb-6">
        <TabsList>
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="success">Successful</TabsTrigger>
          <TabsTrigger value="failure">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>Detailed log entries for this workflow</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map((log: any) => (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <button className="flex-shrink-0">
                      {expandedLogId === log.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.error ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div>
                        <span className="font-medium">#{log.ticketId}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {log.trigger}
                      </Badge>
                      {log.error && (
                        <Badge variant="destructive" className="text-xs">
                          Failed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(log.executedAt)}
                      </span>
                      <span>{log.durationMs}ms</span>
                    </div>
                  </div>

                  {expandedLogId === log.id && (
                    <div className="border-t p-4 bg-muted/30">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Execution ID
                            </p>
                            <p className="text-sm font-mono">{log.uuid}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Executed At
                            </p>
                            <p className="text-sm">{formatDate(log.executedAt)}</p>
                          </div>
                        </div>

                        {log.error && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Error
                            </p>
                            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {log.error}
                            </p>
                          </div>
                        )}

                        {log.conditionsResult && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Conditions Result
                            </p>
                            <pre className="text-xs bg-background p-2 rounded overflow-auto">
                              {JSON.stringify(log.conditionsResult, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.actionsResult && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Actions Result
                            </p>
                            <pre className="text-xs bg-background p-2 rounded overflow-auto">
                              {JSON.stringify(log.actionsResult, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/tickets/${log.ticketId}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Ticket
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>No execution logs found</p>
            </div>
          )}

          {filteredLogs && filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {filteredLogs.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {currentPage + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={filteredLogs.length < pageSize}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
