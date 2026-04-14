import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, Users, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useTeamsList, useTeamDelete } from "@/hooks/teams";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/teams/")({
  loader: async ({ context }) => {
    return context.orpc.teams.list.queryOptions({ organizationId: getCurrentOrganizationId()! });
  },
  component: TeamsIndexRoute,
});

function TeamsIndexRoute() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();

  const { data: teams, isLoading } = useTeamsList({ organizationId });

  const deleteMutation = useTeamDelete();

  const handleDelete = (teamId: number) => {
    if (confirm("Are you sure you want to delete this team?")) {
      deleteMutation.mutate({ id: teamId });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage support teams</p>
        </div>
        <Link to="/teams/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team: any) => (
            <Card key={team.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/teams/${team.id}` as any)}>
                        <User className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/teams/${team.id}` as any)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(team.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{team.autoAssignMethod?.replace("_", " ") || "Round Robin"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No teams found</p>
            <Link to="/teams/new">
              <Button className="mt-4">Create your first team</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
