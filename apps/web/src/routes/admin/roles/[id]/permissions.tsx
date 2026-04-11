import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Checkbox } from "@ticket-app/ui/components/checkbox";

import { orpc } from "@/utils/orpc";
import { ArrowLeft, Shield, Save, Lock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/roles/id/permissions")({
  component: RolePermissionsRoute,
});

const PERMISSION_GROUPS = [
  {
    name: "Tickets",
    permissions: [
      { key: "tickets.view", label: "View Tickets" },
      { key: "tickets.create", label: "Create Tickets" },
      { key: "tickets.edit", label: "Edit Tickets" },
      { key: "tickets.delete", label: "Delete Tickets" },
      { key: "tickets.assign", label: "Assign Tickets" },
    ],
  },
  {
    name: "Contacts",
    permissions: [
      { key: "contacts.view", label: "View Contacts" },
      { key: "contacts.create", label: "Create Contacts" },
      { key: "contacts.edit", label: "Edit Contacts" },
      { key: "contacts.delete", label: "Delete Contacts" },
    ],
  },
  {
    name: "Users",
    permissions: [
      { key: "users.view", label: "View Users" },
      { key: "users.invite", label: "Invite Users" },
      { key: "users.edit", label: "Edit Users" },
      { key: "users.delete", label: "Delete Users" },
    ],
  },
  {
    name: "Reports",
    permissions: [
      { key: "reports.view", label: "View Reports" },
      { key: "reports.export", label: "Export Reports" },
    ],
  },
  {
    name: "Settings",
    permissions: [
      { key: "settings.view", label: "View Settings" },
      { key: "settings.edit", label: "Edit Settings" },
    ],
  },
  {
    name: "Mailboxes",
    permissions: [
      { key: "mailboxes.view", label: "View Mailboxes" },
      { key: "mailboxes.configure", label: "Configure Mailboxes" },
    ],
  },
  {
    name: "Workflows",
    permissions: [
      { key: "workflows.view", label: "View Workflows" },
      { key: "workflows.create", label: "Create Workflows" },
      { key: "workflows.edit", label: "Edit Workflows" },
      { key: "workflows.delete", label: "Delete Workflows" },
    ],
  },
  {
    name: "Billing",
    permissions: [
      { key: "billing.view", label: "View Billing" },
      { key: "billing.manage", label: "Manage Billing" },
    ],
  },
];

const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["*"],
  admin: [
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.delete",
    "tickets.assign",
    "contacts.view",
    "contacts.create",
    "contacts.edit",
    "contacts.delete",
    "users.view",
    "users.invite",
    "users.edit",
    "users.delete",
    "reports.view",
    "reports.export",
    "settings.view",
    "settings.edit",
    "mailboxes.view",
    "mailboxes.configure",
    "workflows.view",
    "workflows.create",
    "workflows.edit",
    "workflows.delete",
    "billing.view",
    "billing.manage",
  ],
  supervisor: [
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "tickets.assign",
    "contacts.view",
    "contacts.create",
    "contacts.edit",
    "users.view",
    "reports.view",
    "reports.export",
    "settings.view",
    "mailboxes.view",
    "workflows.view",
    "workflows.create",
    "workflows.edit",
  ],
  agent: [
    "tickets.view",
    "tickets.create",
    "tickets.edit",
    "contacts.view",
    "contacts.create",
    "reports.view",
    "settings.view",
    "mailboxes.view",
    "workflows.view",
  ],
  readonly: [
    "tickets.view",
    "contacts.view",
    "users.view",
    "reports.view",
    "settings.view",
    "mailboxes.view",
    "workflows.view",
  ],
};

function RolePermissionsRoute() {
  const { id }: any = Route.useParams();
  const queryClient = useQueryClient();
  const _navigate = useNavigate();
  const roleId = Number(id);

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const {
    data: role,
    isLoading,
    refetch,
  }: any = useQuery(orpc.users.getRole.queryOptions({ id: roleId } as any));

  const updatePermissionsMutation = useMutation(
    orpc.users.updateRolePermissions.mutationOptions({
      onSuccess: () => {
        refetch();
        setHasChanges(false);
        queryClient.invalidateQueries({ queryKey: ["roles"] });
      },
    }),
  );

  useEffect(() => {
    if (role?.permissions) {
      const currentPermissions = new Set<string>(
        role.permissions.map((rp: any) => rp.permission.key),
      );
      setSelectedPermissions(currentPermissions);
    }
  }, [role]);

  const togglePermission = (permissionKey: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionKey)) {
      newPermissions.delete(permissionKey);
    } else {
      newPermissions.add(permissionKey);
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  const toggleGroup = (groupPermissions: { key: string }[]) => {
    const groupKeys = groupPermissions.map((p) => p.key);
    const allSelected = groupKeys.every((key) => selectedPermissions.has(key));

    const newPermissions = new Set(selectedPermissions);
    if (allSelected) {
      groupKeys.forEach((key) => newPermissions.delete(key));
    } else {
      groupKeys.forEach((key) => newPermissions.add(key));
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  const isGroupAllSelected = (groupPermissions: { key: string }[]) => {
    return groupPermissions.every((p) => selectedPermissions.has(p.key));
  };

  const isGroupPartialSelected = (groupPermissions: { key: string }[]) => {
    const someSelected = groupPermissions.some((p) => selectedPermissions.has(p.key));
    const allSelected = groupPermissions.every((p) => selectedPermissions.has(p.key));
    return someSelected && !allSelected;
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate({
      roleId,
      permissionIds: [],
      updatedBy: 1,
    } as any);
  };

  const isSystemRole = role?.isSystem;
  const rolePermissionKeys = role?.name?.toLowerCase() || "";
  const inheritedPermissions = SYSTEM_ROLE_PERMISSIONS[rolePermissionKeys] || [];
  const hasInheritedPermissions = inheritedPermissions.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Role not found</h1>
          <Link to="/admin/roles">
            <Button className="mt-4">Back to Roles</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSystemRole) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Link to="/admin/roles">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            {role.name} Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            System roles have predefined permissions that cannot be modified
          </p>
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">Inherited Permissions</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This system role inherits permissions from the platform configuration. These
                  permissions are automatically managed and cannot be changed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERMISSION_GROUPS.map((group) => {
            const _inheritedInGroup =
              hasInheritedPermissions === false ||
              inheritedPermissions.includes("*") ||
              group.permissions.every((p) => inheritedPermissions.includes(p.key));
            const allInherited =
              inheritedPermissions.includes("*") ||
              group.permissions.every((p) => inheritedPermissions.includes(p.key));

            return (
              <Card key={group.name} className={allInherited ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.permissions.map((permission) => {
                      const isInherited =
                        hasInheritedPermissions === false ||
                        inheritedPermissions.includes("*") ||
                        inheritedPermissions.includes(permission.key);
                      return (
                        <label
                          key={permission.key}
                          className={`flex items-center gap-2 cursor-pointer ${
                            isInherited ? "opacity-50" : ""
                          }`}
                        >
                          <Checkbox
                            checked={selectedPermissions.has(permission.key)}
                            disabled={true}
                          />
                          <span className="text-sm">{permission.label}</span>
                          {isInherited && (
                            <span className="text-xs text-muted-foreground ml-auto">inherited</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Link to="/admin/roles">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              {role.name} Permissions
            </h1>
            <p className="text-muted-foreground mt-1">Configure what this role can access and do</p>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={updatePermissionsMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PERMISSION_GROUPS.map((group) => (
          <Card key={group.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <Checkbox
                  checked={isGroupAllSelected(group.permissions)}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = isGroupPartialSelected(group.permissions);
                    }
                  }}
                  onCheckedChange={() => toggleGroup(group.permissions)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -mx-1 rounded"
                  >
                    <Checkbox
                      checked={selectedPermissions.has(permission.key)}
                      onCheckedChange={() => togglePermission(permission.key)}
                    />
                    <span className="text-sm">{permission.label}</span>
                    <code className="text-xs text-muted-foreground ml-auto">{permission.key}</code>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || updatePermissionsMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
        </Button>
      </div>
    </div>
  );
}
