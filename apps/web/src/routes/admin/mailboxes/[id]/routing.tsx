import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { Loader2, ArrowLeft, Plus, Trash2, GripVertical, Save, Edit2, X } from "lucide-react";
import { orpc } from "@/utils/orpc";

interface RoutingRule {
  id?: number;
  name: string;
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  conditionOperator: "and" | "or";
  actions: {
    type: string;
    value: string;
  }[];
  priority: number;
  isActive: boolean;
}

const CONDITION_FIELDS = [
  { value: "sender_domain", label: "Sender Domain" },
  { value: "sender_email", label: "Sender Email" },
  { value: "subject", label: "Subject" },
  { value: "has_attachment", label: "Has Attachment" },
  { value: "recipient", label: "Recipient" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
];

const ACTION_TYPES = [
  { value: "assign_team", label: "Assign to Team" },
  { value: "assign_agent", label: "Assign to Agent" },
  { value: "set_priority", label: "Set Priority" },
  { value: "add_tags", label: "Add Tags" },
  { value: "set_status", label: "Set Status" },
];

export const Route = createFileRoute("/admin/mailboxes/$id/routing")({
  component: MailboxRoutingRoute,
});

function MailboxRoutingRoute() {
  const { id } = useParams({ from: "/admin/mailboxes/$id/routing" });
  const mailboxId = Number(id);

  const { data: mailbox, isLoading } = useQuery(
    (orpc as any).mailboxes.get.queryOptions({
      id: mailboxId,
    }),
  );

  const { data: rules, refetch } = useQuery(
    (orpc as any).mailboxes.getRoutingRules.queryOptions({
      mailboxId,
    }),
  );

  const { data: teams } = useQuery(
    (orpc as any).teams.list.queryOptions({
      organizationId: 1,
    }),
  );

  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createRuleMutation = useMutation(
    (orpc as any).mailboxes.createRoutingRule.mutationOptions({
      onSuccess: () => {
        setEditingRule(null);
        setIsCreating(false);
        refetch();
      },
    }),
  );

  const updateRuleMutation = useMutation(
    (orpc as any).mailboxes.updateRoutingRule.mutationOptions({
      onSuccess: () => {
        setEditingRule(null);
        refetch();
      },
    }),
  );

  const deleteRuleMutation = useMutation(
    (orpc as any).mailboxes.deleteRoutingRule.mutationOptions({
      onSuccess: () => {
        setEditingRule(null);
        refetch();
      },
    }),
  );

  const reorderMutation = useMutation(
    (orpc as any).mailboxes.reorderRoutingRules.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  const handleSaveRule = () => {
    if (!editingRule) return;

    if (editingRule.id) {
      updateRuleMutation.mutate({
        id: editingRule.id,
        mailboxId,
        data: editingRule,
      });
    } else {
      createRuleMutation.mutate({
        mailboxId,
        data: editingRule,
      });
    }
  };

  const handleDeleteRule = (ruleId: number) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRuleMutation.mutate({ id: ruleId });
    }
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= (rules?.length || 0)) return;

    const newOrder = [...(rules || [])];
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, removed);

    reorderMutation.mutate({
      mailboxId,
      ruleIds: newOrder.map((r) => r.id),
    });
  };

  const startEditing = (rule?: RoutingRule) => {
    if (rule) {
      setEditingRule({ ...rule });
    } else {
      setEditingRule({
        name: "",
        conditions: [{ field: "sender_domain", operator: "contains", value: "" }],
        conditionOperator: "and",
        actions: [{ type: "assign_team", value: "" }],
        priority: (rules?.length || 0) + 1,
        isActive: true,
      });
    }
    setIsCreating(true);
  };

  const addCondition = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: [
        ...editingRule.conditions,
        { field: "sender_domain", operator: "contains", value: "" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<(typeof editingRule.conditions)[0]>) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      conditions: editingRule.conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    });
  };

  const addAction = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      actions: [...editingRule.actions, { type: "assign_team", value: "" }],
    });
  };

  const removeAction = (index: number) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      actions: editingRule.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (index: number, updates: Partial<(typeof editingRule.actions)[0]>) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      actions: editingRule.actions.map((a, i) => (i === index ? { ...a, ...updates } : a)),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <Link to="/admin/mailboxes/$id" params={{ id }}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mailbox
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Routing Rules</h1>
            <p className="text-muted-foreground">Configure email routing for {mailbox?.name}</p>
          </div>
          {!isCreating && (
            <Button onClick={() => startEditing()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          )}
        </div>
      </div>

      {isCreating && editingRule && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingRule.id ? "Edit Rule" : "Create New Rule"}</CardTitle>
            <CardDescription>Define conditions and actions for this routing rule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                value={editingRule.name}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="e.g., VIP Customer Routing"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={editingRule.isActive}
                onCheckedChange={(checked) =>
                  setEditingRule({ ...editingRule, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="font-normal">
                Active
              </Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={editingRule.conditionOperator}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        conditionOperator: e.target.value as "and" | "or",
                      })
                    }
                    className="h-8 rounded-none border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingRule.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    className="h-8 w-[150px] rounded-none border border-input bg-transparent px-2 text-xs"
                  >
                    {CONDITION_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value })}
                    className="h-8 w-[130px] rounded-none border border-input bg-transparent px-2 text-xs"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCondition(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Actions</Label>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {editingRule.actions.map((action, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(index, { type: e.target.value, value: "" })}
                    className="h-8 w-[150px] rounded-none border border-input bg-transparent px-2 text-xs"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  {action.type === "assign_team" ? (
                    <select
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      className="flex-1 h-8 rounded-none border border-input bg-transparent px-2 text-xs"
                    >
                      <option value="">Select team</option>
                      {teams?.map((team) => (
                        <option key={team.id} value={String(team.id)}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={action.value}
                      onChange={(e) => updateAction(index, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1"
                    />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeAction(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRule(null);
                  setIsCreating(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRule}
                disabled={!editingRule.name || updateRuleMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rules ({rules?.length || 0})</CardTitle>
          <CardDescription>Rules are evaluated in order from top to bottom</CardDescription>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    !rule.isActive ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      {!rule.isActive && (
                        <span className="text-xs text-muted-foreground">(Inactive)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rule.conditions.length} condition(s), {rule.actions.length} action(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveRule(index, "up")}
                      disabled={index === 0}
                    >
                      <span className="text-xs">↑</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveRule(index, "down")}
                      disabled={index === rules.length - 1}
                    >
                      <span className="text-xs">↓</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEditing(rule)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rule.id && handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No routing rules configured</p>
              <Button onClick={() => startEditing()}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
