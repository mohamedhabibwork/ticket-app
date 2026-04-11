import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { orpc } from "@/utils/orpc";
import { MoreHorizontal, Plus, Edit, Trash2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/admin/roles/")({
  component: RolesListRoute,
});

function RolesListRoute() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: rolesData, isLoading }: any = useQuery(
    orpc.roles.list.queryOptions({ organizationId: 1 } as any),
  );

  const deleteMutation = useMutation(
    orpc.users.deleteRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["roles"] });
      },
    }),
  );

  const handleDelete = (roleId: number, roleName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate({ roleId, userId: 1, organizationId: 1 });
    }
  };

  const SYSTEM_ROLES = ["Owner", "Admin", "Supervisor", "Agent", "Readonly"];

  const _isSystemRole = (roleName: string) => {
    return SYSTEM_ROLES.some((sys) => roleName.toLowerCase() === sys.toLowerCase());
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground mt-1">Manage user roles and permissions</p>
        </div>
        <Link to="/admin/roles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : rolesData && rolesData.length > 0 ? (
          rolesData.map((role: any) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {role.name}
                        {role.isSystem && (
                          <span className="ml-2 px-1.5 py-0.5 bg-muted text-xs rounded">
                            System
                          </span>
                        )}
                      </CardTitle>
                      {role.slug && (
                        <div className="text-xs text-muted-foreground">{role.slug}</div>
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
                      <DropdownMenuItem onClick={() => navigate(`/admin/roles/${role.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/roles/${role.id}/permissions`)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Permissions
                      </DropdownMenuItem>
                      {!role.isSystem && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(role.id, role.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {role.description || "No description provided"}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{role.userRoles?.length || 0} users</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No roles found. Create your first role to get started.
          </div>
        )}
      </div>
    </div>
  );
}
