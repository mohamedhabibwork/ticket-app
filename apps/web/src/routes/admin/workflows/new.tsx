import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ticket-app/ui/components/select";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Zap, Save } from "lucide-react";

const TRIGGERS = [
  { value: "ticket_created", label: "Ticket Created" },
  { value: "ticket_updated", label: "Ticket Updated" },
  { value: "ticket_status_changed", label: "Status Changed" },
  { value: "ticket_priority_changed", label: "Priority Changed" },
  { value: "ticket_assigned", label: "Ticket Assigned" },
  { value: "sla_breached", label: "SLA Breached" },
  { value: "time_elapsed", label: "Time Elapsed" },
];

export const Route = createFileRoute("/admin/workflows/new")({
  component: NewWorkflowRoute,
});

function NewWorkflowRoute() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<string>("ticket_created");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useMutation(
    orpc.workflows.create.mutationOptions({
      onSuccess: (data) => {
        navigate({
          to: "/admin/workflows/builder",
          search: { workflowId: data.id },
        });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      organizationId: 1,
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: trigger as any,
      conditions: { operator: "and", rules: [] },
      actions: [],
      isActive,
    });
  };

  const handleSaveAndOpenBuilder = () => {
    if (!name.trim()) return;

    createMutation.mutate({
      organizationId: 1,
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: trigger as any,
      conditions: { operator: "and", rules: [] },
      actions: [],
      isActive,
    });
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-8">
        <Link
          to="/admin/workflows"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflows
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create New Workflow</h1>
            <p className="text-muted-foreground">
              Define the basic information for your workflow
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your workflow a name and select when it should trigger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Workflow Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Urgent Ticket Assignment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">
                Trigger Event <span className="text-destructive">*</span>
              </Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This determines when the workflow will be executed
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="isActive" className="font-normal">
                Active (workflow will run when triggered)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link to="/admin/workflows">Cancel</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndOpenBuilder}
            disabled={!name.trim() || createMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Save & Open in Builder
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || createMutation.isPending}
          >
            Create Workflow
          </Button>
        </div>
      </form>
    </div>
  );
}
