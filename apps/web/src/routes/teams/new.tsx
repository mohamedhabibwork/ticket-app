import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Loader2, ChevronDown } from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/teams/new")({
  component: NewTeamRoute,
});

function NewTeamRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organizationId = 1;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [autoAssignMethod, setAutoAssignMethod] = useState<string>("round_robin");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  const { data: agents }: any = useQuery(
    orpc.users.list.queryOptions({
      organizationId,
      isActive: true,
      limit: 100,
    } as any),
  );

  const createMutation = useMutation(
    orpc.teams.create.mutationOptions({
      onSuccess: async (data) => {
        toast.success("Team created successfully");
        queryClient.invalidateQueries(orpc.teams.list.queryOptions({ organizationId }));
        if (selectedLeadId) {
          await orpc.teams.addMember.mutateAsync({
            teamId: data.id,
            userId: selectedLeadId,
            isLead: true,
          });
        }
        navigate({ to: "/teams" });
      },
      onError: (error) => {
        toast.error(`Failed to create team: ${error.message}`);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    createMutation.mutate({
      organizationId,
      name: name.trim(),
      description: description.trim() || undefined,
      autoAssignMethod: autoAssignMethod as "round_robin" | "load_balanced" | "least_assigned",
    });
  };

  const selectedLead = agents?.users?.find((u) => u.id === selectedLeadId);

  const autoAssignOptions = [
    { value: "round_robin", label: "Round Robin" },
    { value: "load_balanced", label: "Load Balanced" },
    { value: "least_assigned", label: "Least Assigned" },
  ];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Team</h1>
        <p className="text-muted-foreground">Create a new support team</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  placeholder="Support Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Handles tier 1 support tickets"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Auto-assign Method</Label>
                <DropdownMenu open={showLeadDropdown} onOpenChange={setShowLeadDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {autoAssignOptions.find((o) => o.value === autoAssignMethod)?.label ||
                        "Select method"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full">
                    {autoAssignOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => {
                          setAutoAssignMethod(option.value);
                          setShowLeadDropdown(false);
                        }}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label>Team Lead</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedLead
                        ? `${selectedLead.firstName} ${selectedLead.lastName}`
                        : "Select team lead (optional)"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full max-h-60 overflow-y-auto">
                    <DropdownMenuItem onClick={() => setSelectedLeadId(null)}>
                      None
                    </DropdownMenuItem>
                    {agents?.users?.map((agent) => (
                      <DropdownMenuItem key={agent.id} onClick={() => setSelectedLeadId(agent.id)}>
                        {agent.firstName} {agent.lastName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/teams" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Team
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
