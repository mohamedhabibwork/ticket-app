import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { Badge } from "@ticket-app/ui/components/badge";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { Plus, Trash2, GripVertical, Play, Save, X, AlertCircle } from "lucide-react";

import { orpc } from "@/utils/orpc";

interface ConditionRule {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty" | "in" | "not_in";
  value: string;
}

interface WorkflowAction {
  type: "assign_agent" | "assign_team" | "set_priority" | "set_status" | "add_tags" | "remove_tags" | "send_email" | "send_webhook" | "create_task" | "add_note" | "apply_saved_reply";
  params: Record<string, unknown>;
}

interface Workflow {
  id?: number;
  name: string;
  description: string;
  trigger: string;
  conditions: {
    operator: "and" | "or";
    rules: ConditionRule[];
  };
  actions: WorkflowAction[];
  isActive: boolean;
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
];

export const Route = createFileRoute("/admin/workflows/builder")({
  component: WorkflowBuilderRoute,
});

function WorkflowBuilderRoute() {
  const [workflow, setWorkflow] = useState<Workflow>({
    name: "",
    description: "",
    trigger: "ticket_created",
    conditions: {
      operator: "and",
      rules: [],
    },
    actions: [],
    isActive: true,
  });

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: workflowsList } = useQuery(
    orpc.workflows.list.queryOptions({
      organizationId: 1,
      isActive: undefined,
    })
  );

  const createMutation = useMutation(
    orpc.workflows.create.mutationOptions({
      onSuccess: (data) => {
        console.log("Workflow created:", data);
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

  const addCondition = () => {
    setWorkflow({
      ...workflow,
      conditions: {
        ...workflow.conditions,
        rules: [
          ...workflow.conditions.rules,
          { field: "status_id", operator: "equals", value: "" },
        ],
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
        rules: workflow.conditions.rules.map((rule, i) =>
          i === index ? { ...rule, ...updates } : rule
        ),
      },
    });
  };

  const addAction = () => {
    setWorkflow({
      ...workflow,
      actions: [
        ...workflow.actions,
        { type: "set_priority", params: {} },
      ],
    });
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
      actions: workflow.actions.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      ),
    });
  };

  const handleSave = () => {
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

  const loadWorkflow = (workflowToLoad: (typeof workflowsList)[0]) => {
    setSelectedWorkflowId(workflowToLoad.id);
    setWorkflow({
      name: workflowToLoad.name,
      description: workflowToLoad.description || "",
      trigger: workflowToLoad.trigger,
      conditions: workflowToLoad.conditions as Workflow["conditions"],
      actions: workflowToLoad.actions as WorkflowAction[],
      isActive: workflowToLoad.isActive,
    });
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
    } catch (error) {
      console.error("Test failed:", error);
    }
    setIsTesting(false);
  };

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create automation rules to streamline your support workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!selectedWorkflowId || isTesting}
          >
            <Play className="mr-2 h-4 w-4" />
            {isTesting ? "Testing..." : "Test"}
          </Button>
          <Button onClick={handleSave} disabled={!workflow.name}>
            <Save className="mr-2 h-4 w-4" />
            Save Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflows</CardTitle>
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
                      {TRIGGERS.find((t) => t.value === w.trigger)?.label}
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
        </div>

        <div className="col-span-9 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name *</Label>
                  <Input
                    id="name"
                    value={workflow.name}
                    onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                    placeholder="e.g., Urgent Ticket Assignment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger Event *</Label>
                  <Select
                    value={workflow.trigger}
                    onValueChange={(value) =>
                      setWorkflow({ ...workflow, trigger: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={workflow.description}
                  onChange={(e) =>
                    setWorkflow({ ...workflow, description: e.target.value })
                  }
                  placeholder="Describe what this workflow does..."
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={workflow.isActive}
                  onCheckedChange={(checked) =>
                    setWorkflow({ ...workflow, isActive: checked as boolean })
                  }
                />
                <Label htmlFor="isActive" className="font-normal">
                  Active (workflow will run when triggered)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="conditions" className="w-full">
            <TabsList>
              <TabsTrigger value="conditions">
                Conditions ({workflow.conditions.rules.length})
              </TabsTrigger>
              <TabsTrigger value="actions">
                Actions ({workflow.actions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conditions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Conditions</CardTitle>
                      <CardDescription>
                        Define when this workflow should run
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={workflow.conditions.operator}
                        onValueChange={(value: "and" | "or") =>
                          setWorkflow({
                            ...workflow,
                            conditions: {
                              ...workflow.conditions,
                              operator: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={addCondition}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {workflow.conditions.rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="mb-2 h-8 w-8" />
                      <p>No conditions defined. Add a rule to control when this workflow runs.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workflow.conditions.rules.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg border p-3"
                        >
                          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                          <Select
                            value={rule.field}
                            onValueChange={(value) =>
                              updateCondition(index, { field: value })
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={rule.operator}
                            onValueChange={(value: ConditionRule["operator"]) =>
                              updateCondition(index, { operator: value })
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATORS.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                            <Input
                              value={rule.value}
                              onChange={(e) =>
                                updateCondition(index, { value: e.target.value })
                              }
                              placeholder="Value"
                              className="flex-1"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCondition(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Actions</CardTitle>
                      <CardDescription>
                        Define what happens when conditions are met
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addAction}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Action
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {workflow.actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="mb-2 h-8 w-8" />
                      <p>No actions defined. Add an action to automate your workflow.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workflow.actions.map((action, index) => (
                        <div
                          key={index}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Select
                              value={action.type}
                              onValueChange={(value: WorkflowAction["type"]) =>
                                updateAction(index, { type: value, params: {} })
                              }
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Action Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAction(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <ActionParamsEditor
                            action={action}
                            onUpdate={(params) =>
                              updateAction(index, { params })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
        <div className="space-y-2">
          <Label>Agent ID</Label>
          <Input
            type="number"
            value={(action.params.agentId as string) || ""}
            onChange={(e) =>
              onUpdate({ agentId: e.target.value })
            }
            placeholder="Enter agent ID"
          />
        </div>
      );

    case "assign_team":
      return (
        <div className="space-y-2">
          <Label>Team ID</Label>
          <Input
            type="number"
            value={(action.params.teamId as string) || ""}
            onChange={(e) =>
              onUpdate({ teamId: e.target.value })
            }
            placeholder="Enter team ID"
          />
        </div>
      );

    case "set_priority":
      return (
        <div className="space-y-2">
          <Label>Priority ID</Label>
          <Input
            type="number"
            value={(action.params.priorityId as string) || ""}
            onChange={(e) =>
              onUpdate({ priorityId: e.target.value })
            }
            placeholder="Enter priority ID"
          />
        </div>
      );

    case "set_status":
      return (
        <div className="space-y-2">
          <Label>Status ID</Label>
          <Input
            type="number"
            value={(action.params.statusId as string) || ""}
            onChange={(e) =>
              onUpdate({ statusId: e.target.value })
            }
            placeholder="Enter status ID"
          />
        </div>
      );

    case "add_tags":
    case "remove_tags":
      return (
        <div className="space-y-2">
          <Label>Tag IDs (comma-separated)</Label>
          <Input
            value={(action.params.tagIds as string) || ""}
            onChange={(e) =>
              onUpdate({
                tagIds: e.target.value.split(",").map((s) => s.trim()),
              })
            }
            placeholder="1, 2, 3"
          />
        </div>
      );

    case "send_email":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>To (email)</Label>
            <Input
              value={(action.params.to as string) || ""}
              onChange={(e) => onUpdate({ to: e.target.value })}
              placeholder="customer@example.com or {{contact.email}}"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={(action.params.subject as string) || ""}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="Re: {{ticket.subject}}"
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={(action.params.body as string) || ""}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Email body with merge tags..."
              rows={4}
            />
          </div>
        </div>
      );

    case "send_webhook":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              value={(action.params.url as string) || ""}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://api.example.com/webhook"
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={(action.params.method as string) || "POST"}
              onValueChange={(value) => onUpdate({ method: value })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={(action.params.title as string) || ""}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={(action.params.description as string) || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Task description..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Assignee User IDs (comma-separated)</Label>
            <Input
              value={(action.params.assigneeUserIds as string) || ""}
              onChange={(e) =>
                onUpdate({
                  assigneeUserIds: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              placeholder="1, 2, 3"
            />
          </div>
        </div>
      );

    case "add_note":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Note Body</Label>
            <Textarea
              value={(action.params.body as string) || ""}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Note content..."
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrivate"
              checked={(action.params.isPrivate as boolean) ?? true}
              onCheckedChange={(checked) =>
                onUpdate({ isPrivate: checked })
              }
            />
            <Label htmlFor="isPrivate" className="font-normal">
              Internal note (private)
            </Label>
          </div>
        </div>
      );

    case "apply_saved_reply":
      return (
        <div className="space-y-2">
          <Label>Saved Reply ID</Label>
          <Input
            type="number"
            value={(action.params.savedReplyId as string) || ""}
            onChange={(e) =>
              onUpdate({ savedReplyId: e.target.value })
            }
            placeholder="Enter saved reply ID"
          />
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground text-sm">
          No parameters needed for this action type.
        </div>
      );
  }
}
