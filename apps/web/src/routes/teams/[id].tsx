import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ticket-app/ui/components/tabs";
import { Loader2, ArrowLeft, Edit, Users, UserPlus, User, Ticket, Crown } from "lucide-react";

import {
  useTeam,
  useTeamMembers,
  useTeamUpdate,
  useTeamAddMember,
  useTeamRemoveMember,
} from "@/hooks/teams";
import { useUsersList } from "@/hooks/users";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/teams/id")({
  loader: async ({ params, context }) => {
    const teamId = Number(params.id);
    return {
      team: context.orpc.teams.get.queryOptions({ id: teamId }),
      members: context.orpc.teams.members.queryOptions({ teamId }),
      agents: context.orpc.users.list.queryOptions({
        organizationId: getCurrentOrganizationId()!,
        isActive: true,
        limit: 100,
      }),
      tickets: context.orpc.tickets.list.queryOptions({
        organizationId: getCurrentOrganizationId()!,
        assignedTeamId: teamId,
        limit: 10,
      }),
    };
  },
  component: TeamDetailRoute,
});

function TeamDetailRoute() {
  const { id } = Route.useParams() as { id: string };
  const _navigate = useNavigate();
  const { organizationId } = useOrganization();
  const teamId = Number(id);

  const loaderData = Route.useLoaderData<typeof Route.loader>();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    autoAssignMethod: "round_robin",
  });
  const [newMemberId, setNewMemberId] = useState<number | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const { data: team, isLoading } = useTeam({ id: teamId });

  const { data: members } = useTeamMembers({ teamId });

  const { data: agents } = useUsersList({
    organizationId,
    isActive: true,
    limit: 100,
  });

  const { data: teamTickets }: any = useQuery(loaderData.tickets as any);

  const updateMutation = useTeamUpdate();

  const addMemberMutation = useTeamAddMember();

  const removeMemberMutation = useTeamRemoveMember();

  const handleSave = () => {
    updateMutation.mutate({
      id: teamId,
      ...editData,
    });
  };

  const handleAddMember = () => {
    if (!newMemberId) return;
    addMemberMutation.mutate({
      teamId,
      userId: newMemberId,
    });
  };

  const handleRemoveMember = (userId: number) => {
    if (confirm("Are you sure you want to remove this member from the team?")) {
      removeMemberMutation.mutate({
        teamId,
        userId,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Team not found</p>
            <Link to="/teams">
              <Button variant="ghost" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Teams
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableAgents = agents?.users?.filter(
    (agent: any) => !members?.some((m: any) => m.userId === agent.id),
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">Team Details</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
          <Edit className="h-4 w-4 mr-2" />
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Team Name</Label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-assign Method</Label>
                    <select
                      className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                      value={editData.autoAssignMethod}
                      onChange={(e) =>
                        setEditData({ ...editData, autoAssignMethod: e.target.value })
                      }
                    >
                      <option value="round_robin">Round Robin</option>
                      <option value="load_balanced">Load Balanced</option>
                      <option value="least_assigned">Least Assigned</option>
                    </select>
                  </div>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-sm text-muted-foreground">Description</span>
                      <p>{team.description || "No description"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Auto-assign Method</span>
                      <p className="capitalize">
                        {team.autoAssignMethod?.replace("_", " ") || "Round Robin"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </span>
                <div className="flex items-center gap-2">
                  <DropdownMenu open={showMemberDropdown} onOpenChange={setShowMemberDropdown}>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {availableAgents && availableAgents.length > 0 ? (
                        availableAgents.map((agent: any) => (
                          <DropdownMenuItem
                            key={agent.id}
                            onClick={() => {
                              setNewMemberId(agent.id);
                              handleAddMember();
                            }}
                          >
                            {agent.firstName} {agent.lastName}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>No available agents</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {member.isLead ? (
                            <Crown className="h-4 w-4 text-primary" />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.userFirstName} {member.userLastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.isLead && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Lead
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No members in this team</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Team Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamTickets && teamTickets.length > 0 ? (
                <div className="space-y-3">
                  {teamTickets.map((ticket: any) => (
                    <Link key={ticket.id} to="/tickets/id" params={{ id: String(ticket.id) }}>
                      <div className="flex items-center justify-between p-3 rounded border hover:bg-accent/50">
                        <div>
                          <div className="font-medium">{ticket.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            #{ticket.referenceNumber}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No tickets assigned to this team
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
