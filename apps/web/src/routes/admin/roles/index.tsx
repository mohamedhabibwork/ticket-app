import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ticket-app/ui/components/dropdown-menu";
import { MoreHorizontal, Plus, Edit, Trash2, Shield, Users } from "lucide-react";
import { useRolesList, useRoleDelete } from "@/hooks/roles";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUser } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/roles/")({
  loader: async ({ context }) => {
    const rolesData = await context.orpc.roles.list.query({
      organizationId: getCurrentOrganizationId()!,
    });
    return { rolesData };
  },
  component: RolesListRoute,
});

function RolesListRoute() {
  const { organizationId } = useOrganization();
  const navigate = useNavigate();

  const { rolesData } = Route.useLoaderData<typeof Route>();
  const { user } = useUser();
  const { isLoading } = useRolesList({ organizationId });

  const deleteMutation = useRoleDelete();

  const handleDelete = (roleId: number, roleName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate({ roleId, userId: user?.id ?? null, organizationId });
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
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-7 gap-1 rounded-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/admin/roles/${role.id}` as any)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/roles/${role.id}/permissions` as any)}
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
