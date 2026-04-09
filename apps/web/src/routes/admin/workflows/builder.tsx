import { useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { Badge } from "@ticket-app/ui/components/badge";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { orpc } from "@/utils/orpc";
import {
  Plus,
  Trash2,
  GripVertical,
  Play,
  Save,
  X,
  AlertCircle,
  Zap,
  GitBranch,
  Hammer,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  Grip,
  PanelRightClose,
  PanelRight,
} from "lucide-react";

interface ConditionRule {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty" | "in" | "not_in";
  value: string;
}

interface WorkflowAction {
  type: "assign_agent" | "assign_team" | "set_priority" | "set_status" | "add_tags" | "remove_tags" | "send_email" | "send_webhook" | "create_task" | "add_note" | "apply_saved_reply" | "create_calendar_event";
  params: Record<string, unknown>;
}

interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action";
  label: string;
  data: any;
  position: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

const TRIGGERS = [
  { value: "ticket_created", label: "Ticket Created" },
  { value: "ticket_updated", label: "Ticket Updated" },
  { value: "ticket_status_changed", label: "Status Changed" },
  { value: "ticket_priority_changed", label: "Priority Changed" },
  { value: "ticket_assigned", label: "Ticket Assigned" },
  { value: "sla_breached", label: "SLA Breached" },
  { value: "time_elapsed", label: "Time Elapsed" },
];

const CONDITION_FIELDS = [
  { value: "status_id", label: "Status" },
  { value: "priority_id", label: "Priority" },
  { value: "channel_id", label: "Channel" },
  { value: "contact_id", label: "Contact" },
  { value: "assigned_agent_id", label: "Assigned Agent" },
  { value: "assigned_team_id", label: "Assigned Team" },
  { value: "is_spam", label: "Is Spam" },
  { value: "subject", label: "Subject" },
  { value: "reference_number", label: "Reference Number" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
  { value: "in", label: "In List" },
  { value: "not_in", label: "Not In List" },
];

const ACTION_TYPES = [
  { value: "assign_agent", label: "Assign Agent" },
  { value: "assign_team", label: "Assign Team" },
  { value: "set_priority", label: "Set Priority" },
  { value: "set_status", label: "Set Status" },
  { value: "add_tags", label: "Add Tags" },
  { value: "remove_tags", label: "Remove Tags" },
  { value: "send_email", label: "Send Email" },
  { value: "send_webhook", label: "Send Webhook" },
  { value: "create_task", label: "Create Task" },
  { value: "add_note", label: "Add Note" },
  { value: "apply_saved_reply", label: "Apply Saved Reply" },
  { value: "create_calendar_event", label: "Create Calendar Event" },
];

const TRIGGER_LABELS: Record<string, string> = {
  ticket_created: "Ticket Created",
  ticket_updated: "Ticket Updated",
  ticket_status_changed: "Status Changed",
  ticket_priority_changed: "Priority Changed",
  ticket_assigned: "Ticket Assigned",
  sla_breached: "SLA Breached",
  time_elapsed: "Time Elapsed",
};

export const Route = createFileRoute("/admin/workflows/builder")({
  component: WorkflowBuilderRoute,
});

function WorkflowBuilderRoute() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const initialWorkflowId = search.workflowId;

  const [workflow, setWorkflow] = useState({
    name: "",
    description: "",
    trigger: "ticket_created",
    conditions: { operator: "and" as "and" | "or", rules: [] as ConditionRule[] },
    actions: [] as WorkflowAction[],
    isActive: true,
  });

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(initialWorkflowId || null);
  const [isTesting, setIsTesting] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: workflowsList } = useQuery({
    queryKey: ["workflows", "all"],
    queryFn: () =>
      orpc.workflows.list.queryOptions({
        organizationId: 1,
        isActive: undefined,
      }),
  });

  const { data: executionLogs } = useQuery({
    queryKey: ["workflow-logs-sidebar", selectedWorkflowId],
    queryFn: () =>
      selectedWorkflowId
        ? orpc.workflows.getExecutionLogs.queryOptions({
            workflowId: selectedWorkflowId,
            organizationId: 1,
            limit: 10,
          })
        : null,
    enabled: !!selectedWorkflowId,
  });

  const createMutation = useMutation(
    orpc.workflows.create.mutationOptions({
      onSuccess: (data) => {
        setSelectedWorkflowId(data.id);
        navigate({ to: "/admin/workflows/builder", search: { workflowId: data.id } });
      },
    })
  );

  const updateMutation = useMutation(
    orpc.workflows.update.mutationOptions({
      onSuccess: () => {
        console.log("Workflow updated");
      },
    })
  );

  useEffect(() => {
    if (initialWorkflowId && workflowsList) {
      const workflowToLoad = workflowsList.find((w) => w.id === initialWorkflowId);
      if (workflowToLoad) {
        loadWorkflow(workflowToLoad);
      }
    }
  }, [initialWorkflowId, workflowsList]);

  const loadWorkflow = (workflowToLoad: any) => {
    setSelectedWorkflowId(workflowToLoad.id);
    setWorkflow({
      name: workflowToLoad.name,
      description: workflowToLoad.description || "",
      trigger: workflowToLoad.trigger,
      conditions: workflowToLoad.conditions as typeof workflow.conditions,
      actions: workflowToLoad.actions as WorkflowAction[],
      isActive: workflowToLoad.isActive,
    });

    if (!nodePositions["trigger"]) {
      setNodePositions({
        trigger: { x: 50, y: 100 },
        conditions: { x: 50, y: 200 },
        ...workflowToLoad.actions.reduce((acc: any, _: any, i: number) => {
          acc[`action-${i}`] = { x: 50, y: 300 + i * 100 };
          return acc;
        }, {}),
      });
    }
  };

  const addCondition = () => {
    setWorkflow({
      ...workflow,
      conditions: {
        ...workflow.conditions,
        rules: [...workflow.conditions.rules, { field: "status_id", operator: "equals", value: "" }],
      },
    });
  };

  const removeCondition = (index: number) => {
    setWorkflow({
      ...workflow,
      conditions: {
        ...workflow.conditions,
        rules: workflow.conditions.rules.filter((_, i) => i !== index),
      },
    });
  };

  const updateCondition = (index: number, updates: Partial<ConditionRule>) => {
    setWorkflow({
      ...workflow,
      conditions: {
        ...workflow.conditions,
        rules: workflow.conditions.rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
      },
    });
  };

  const addAction = () => {
    setWorkflow({
      ...workflow,
      actions: [...workflow.actions, { type: "set_priority", params: {} }],
    });
    setNodePositions((prev) => ({
      ...prev,
      [`action-${workflow.actions.length}`]: { x: 50, y: 300 + workflow.actions.length * 100 },
    }));
  };

  const removeAction = (index: number) => {
    setWorkflow({
      ...workflow,
      actions: workflow.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setWorkflow({
      ...workflow,
      actions: workflow.actions.map((action, i) => (i === index ? { ...action, ...updates } : action)),
    });
  };

  const handleSave = () => {
    if (!workflow.name.trim()) return;

    if (selectedWorkflowId) {
      updateMutation.mutate({
        id: selectedWorkflowId,
        organizationId: 1,
        data: workflow,
      });
    } else {
      createMutation.mutate({
        ...workflow,
        organizationId: 1,
      });
    }
  };

  const handleTest = async () => {
    if (!selectedWorkflowId) {
      alert("Please save the workflow first before testing");
      return;
    }
    setIsTesting(true);
    try {
      const result = await orpc.workflows.execute({
        workflowId: selectedWorkflowId,
        ticketId: 1,
        triggerType: workflow.trigger,
      });
      console.log("Test result:", result);
      alert(result.success ? "Test executed successfully!" : `Test failed: ${result.error}`);
    } catch (error) {
      console.error("Test failed:", error);
      alert("Test failed. Check console for details.");
    }
    setIsTesting(false);
  };

  const handleNodeDrag = (nodeId: string, deltaX: number, deltaY: number) => {
    setNodePositions((prev) => ({
      ...prev,
      [nodeId]: {
        x: Math.max(0, (prev[nodeId]?.x || 0) + deltaX),
        y: Math.max(0, (prev[nodeId]?.y || 0) + deltaY),
      },
    }));
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "trigger":
        return "bg-purple-100 border-purple-300 text-purple-800";
      case "condition":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "action":
        return "bg-green-100 border-green-300 text-green-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const renderCanvasNode = (nodeId: string, label: string, type: string, icon: React.ReactNode) => {
    const position = nodePositions[nodeId] || { x: 50, y: 100 };

    return (
      <div
        className={`absolute w-48 rounded-lg border-2 ${getNodeColor(type)} p-3 cursor-move select-none`}
        style={{ left: position.x, top: position.y }}
        onMouseDown={(e) => {
          e.preventDefault();
          setDraggedNode(nodeId);
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs font-medium uppercase">{type}</span>
        </div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    );
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedNode && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const deltaX = e.movementX;
        const deltaY = e.movementY;
        handleNodeDrag(draggedNode, deltaX, deltaY);
      }
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
    };

    if (draggedNode) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedNode]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Workflow Builder</h1>
              <p className="text-muted-foreground text-sm">
                Create automation rules to streamline your support workflow
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRight className="mr-2 h-4 w-4" />}
                {showHistory ? "Hide" : "Show"} History
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!selectedWorkflowId || isTesting}
              >
                <Play className="mr-2 h-4 w-4" />
                {isTesting ? "Testing..." : "Test"}
              </Button>
              <Button onClick={handleSave} disabled={!workflow.name.trim()}>
                <Save className="mr-2 h-4 w-4" />
                Save Workflow
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex">
            <div className="w-72 border-r bg-background overflow-y-auto p-4">
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Workflows</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedWorkflowId(null);
                      setWorkflow({
                        name: "",
                        description: "",
                        trigger: "ticket_created",
                        conditions: { operator: "and", rules: [] },
                        actions: [],
                        isActive: true,
                      });
                      setNodePositions({});
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Workflow
                  </Button>
                  {workflowsList?.map((w) => (
                    <Button
                      key={w.id}
                      variant={selectedWorkflowId === w.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-left"
                      onClick={() => loadWorkflow(w)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{w.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {TRIGGER_LABELS[w.trigger] || w.trigger}
                        </span>
                      </div>
                      {!w.isActive && (
                        <Badge variant="secondary" className="ml-auto">
                          Inactive
                        </Badge>
                      )}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Basic Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs">Name</Label>
                    <Input
                      id="name"
                      value={workflow.name}
                      onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                      placeholder="Workflow name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="trigger" className="text-xs">Trigger</Label>
                    <Select value={workflow.trigger} onValueChange={(value) => setWorkflow({ ...workflow, trigger: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Textarea
                      id="description"
                      value={workflow.description}
                      onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
                      placeholder="Description..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      checked={workflow.isActive}
                      onCheckedChange={(checked) => setWorkflow({ ...workflow, isActive: checked as boolean })}
                    />
                    <Label htmlFor="isActive" className="text-xs font-normal">Active</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 bg-grid p-4 overflow-auto">
                <div
                  ref={canvasRef}
                  className="relative w-full h-full min-h-[500px] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20"
                >
                  <div className="absolute top-4 left-4 text-xs text-muted-foreground">
                    <Zap className="h-4 w-4 inline mr-1" />
                    Drag nodes to position them
                  </div>

                  {renderCanvasNode(
                    "trigger",
                    TRIGGER_LABELS[workflow.trigger] || workflow.trigger,
                    "trigger",
                    <Zap className="h-4 w-4" />
                  )}

                  {workflow.conditions.rules.length > 0 && renderCanvasNode(
                    "conditions",
                    `${workflow.conditions.rules.length} Conditions (${workflow.conditions.operator.toUpperCase()})`,
                    "condition",
                    <GitBranch className="h-4 w-4" />
                  )}

                  {workflow.actions.map((action, index) =>
                    renderCanvasNode(
                      `action-${index}`,
                      ACTION_TYPES.find((a) => a.value === action.type)?.label || action.type,
                      "action",
                      <Hammer className="h-4 w-4" />
                    )
                  )}

                  {workflow.conditions.rules.length === 0 && workflow.actions.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Add conditions and actions to build your workflow</p>
                      </div>
                    </div>
                  )}

                  <svg className="absolute inset-0 pointer-events-none overflow-visible">
                    {draggedNode === null && (
                      <>
                        <path
                          d={`M ${(nodePositions["trigger"]?.x || 50) + 192} ${(nodePositions["trigger"]?.y || 100) + 20} L ${(nodePositions["trigger"]?.x || 50) + 192} ${(nodePositions["trigger"]?.y || 100) + 60}`}
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-muted-foreground"
                        />
                        {workflow.conditions.rules.length > 0 && (
                          <path
                            d={`M ${(nodePositions["trigger"]?.x || 50) + 192} ${(nodePositions["trigger"]?.y || 100) + 60} L ${(nodePositions["conditions"]?.x || 50) + 192} ${(nodePositions["conditions"]?.y || 200)}`}
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-muted-foreground"
                          />
                        )}
                        {workflow.actions.map((_, index) => {
                          const sourceY = workflow.conditions.rules.length > 0
                            ? (nodePositions["conditions"]?.y || 200) + 40
                            : (nodePositions["trigger"]?.y || 100) + 60;
                          const targetY = (nodePositions[`action-${index}`]?.y || 300 + index * 100);
                          return (
                            <path
                              key={`edge-${index}`}
                              d={`M ${(workflow.conditions.rules.length > 0 ? nodePositions["conditions"]?.x : nodePositions["trigger"]?.x) || 50} ${sourceY} L ${(nodePositions[`action-${index}`]?.x || 50) + 96} ${targetY + 20}`}
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-muted-foreground"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                </div>
              </div>

              <Tabs defaultValue="conditions" className="border-t bg-background">
                <div className="px-4 pt-2">
                  <TabsList>
                    <TabsTrigger value="conditions">
                      Conditions ({workflow.conditions.rules.length})
                    </TabsTrigger>
                    <TabsTrigger value="actions">
                      Actions ({workflow.actions.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="conditions" className="p-4 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Match</Label>
                      <Select
                        value={workflow.conditions.operator}
                        onValueChange={(value: "and" | "or") =>
                          setWorkflow({
                            ...workflow,
                            conditions: { ...workflow.conditions, operator: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={addCondition}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {workflow.conditions.rules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No conditions. Add rules to control when this workflow runs.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workflow.conditions.rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-2 rounded border p-2">
                          <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
                          <Select value={rule.field} onValueChange={(value) => updateCondition(index, { field: value })}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_FIELDS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={rule.operator} onValueChange={(value) => updateCondition(index, { operator: value })}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                            <Input
                              value={rule.value}
                              onChange={(e) => updateCondition(index, { value: e.target.value })}
                              placeholder="Value"
                              className="flex-1"
                            />
                          )}
                          <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="h-7 w-7">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="p-4 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-end mb-3">
                    <Button variant="outline" size="sm" onClick={addAction}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Action
                    </Button>
                  </div>

                  {workflow.actions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No actions. Add actions to automate your workflow.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workflow.actions.map((action, index) => (
                        <div key={index} className="rounded border p-2">
                          <div className="flex items-center justify-between mb-2">
                            <Select value={action.type} onValueChange={(value) => updateAction(index, { type: value, params: {} })}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((at) => (
                                  <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => removeAction(index)} className="h-7 w-7">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          <ActionParamsEditor action={action} onUpdate={(params) => updateAction(index, { params })} />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {showHistory && (
            <div className="w-80 border-l bg-background overflow-y-auto p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Executions
              </h3>
              {!executionLogs || executionLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No executions yet
                </p>
              ) : (
                <div className="space-y-2">
                  {executionLogs.map((log: any) => (
                    <div key={log.id} className="rounded border p-2 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        {log.error ? (
                          <XCircle className="h-3 w-3 text-red-600" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        <span className="font-medium">Ticket #{log.ticketId}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(log.executedAt).toLocaleTimeString()} · {log.durationMs}ms
                      </div>
                      {log.error && (
                        <p className="text-red-600 mt-1 truncate">{log.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionParamsEditor({
  action,
  onUpdate,
}: {
  action: WorkflowAction;
  onUpdate: (params: Record<string, unknown>) => void;
}) {
  switch (action.type) {
    case "assign_agent":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Agent ID</Label>
          <Input
            type="number"
            value={(action.params.agentId as string) || ""}
            onChange={(e) => onUpdate({ agentId: e.target.value })}
            placeholder="Enter agent ID"
          />
        </div>
      );

    case "assign_team":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Team ID</Label>
          <Input
            type="number"
            value={(action.params.teamId as string) || ""}
            onChange={(e) => onUpdate({ teamId: e.target.value })}
            placeholder="Enter team ID"
          />
        </div>
      );

    case "set_priority":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Priority ID</Label>
          <Input
            type="number"
            value={(action.params.priorityId as string) || ""}
            onChange={(e) => onUpdate({ priorityId: e.target.value })}
            placeholder="Enter priority ID"
          />
        </div>
      );

    case "set_status":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Status ID</Label>
          <Input
            type="number"
            value={(action.params.statusId as string) || ""}
            onChange={(e) => onUpdate({ statusId: e.target.value })}
            placeholder="Enter status ID"
          />
        </div>
      );

    case "add_tags":
    case "remove_tags":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Tag IDs (comma-separated)</Label>
          <Input
            value={(action.params.tagIds as string) || ""}
            onChange={(e) => onUpdate({ tagIds: e.target.value.split(",").map((s) => s.trim()) })}
            placeholder="1, 2, 3"
          />
        </div>
      );

    case "send_email":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">To (email)</Label>
            <Input
              value={(action.params.to as string) || ""}
              onChange={(e) => onUpdate({ to: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input
              value={(action.params.subject as string) || ""}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="Subject"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Body</Label>
            <Textarea
              value={(action.params.body as string) || ""}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Email body..."
              rows={2}
            />
          </div>
        </div>
      );

    case "send_webhook":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Webhook URL</Label>
            <Input
              value={(action.params.url as string) || ""}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://api.example.com/webhook"
            />
          </div>
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={(action.params.title as string) || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={(action.params.description as string) || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Description..."
              rows={2}
            />
          </div>
        </div>
      );

    case "add_note":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Note Body</Label>
            <Textarea
              value={(action.params.body as string) || ""}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Note content..."
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPrivate"
              checked={(action.params.isPrivate as boolean) ?? true}
              onCheckedChange={(checked) => onUpdate({ isPrivate: checked })}
            />
            <Label htmlFor="isPrivate" className="text-xs font-normal">Internal note</Label>
          </div>
        </div>
      );

    case "apply_saved_reply":
      return (
        <div className="space-y-1">
          <Label className="text-xs">Saved Reply ID</Label>
          <Input
            type="number"
            value={(action.params.savedReplyId as string) || ""}
            onChange={(e) => onUpdate({ savedReplyId: e.target.value })}
            placeholder="Enter saved reply ID"
          />
        </div>
      );

    case "create_calendar_event":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Event Title</Label>
            <Input
              value={(action.params.title as string) || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Ticket follow-up: #{ticket.id}"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={(action.params.description as string) || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Ticket subject: {ticket.subject}"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration (minutes)</Label>
            <Input
              type="number"
              value={(action.params.durationMinutes as string) || "30"}
              onChange={(e) => onUpdate({ durationMinutes: e.target.value })}
              placeholder="30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="addAttendees"
              checked={(action.params.addAttendees as boolean) ?? false}
              onCheckedChange={(checked) => onUpdate({ addAttendees: checked })}
            />
            <Label htmlFor="addAttendees" className="text-xs font-normal">Add ticket contact as attendee</Label>
          </div>
        </div>
      );

    default:
      return (
        <div className="text-xs text-muted-foreground">No parameters needed.</div>
      );
  }
}
