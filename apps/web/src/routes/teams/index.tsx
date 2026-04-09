import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { orpc } from "@/utils/orpc";
import { Plus, MoreHorizontal, Edit, Trash2, Users, User } from "lucide-react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/teams/")({
  component: TeamsIndexRoute,
});

function TeamsIndexRoute() {
  const queryClient = useQueryClient();
  const organizationId = 1;

  const { data: teams, isLoading } = useQuery(
    orpc.teams.list.queryOptions({
      organizationId,
    })
  );

  const deleteMutation = useMutation(
    orpc.teams.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team deleted successfully");
        queryClient.invalidateQueries(orpc.teams.list.queryOptions({ organizationId }));
      },
      onError: (error) => {
        toast.error(`Failed to delete team: ${error.message}`);
      },
    })
  );

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
        <Button asChild>
          <Link to="/teams/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
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
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/teams/$id" params={{ id: String(team.id) }}>
                          <User className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/teams/$id" params={{ id: String(team.id) }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
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
                  <span>
                    {team.autoAssignMethod?.replace("_", " ") || "Round Robin"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No teams found</p>
            <Button className="mt-4" asChild>
              <Link to="/teams/new">Create your first team</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}