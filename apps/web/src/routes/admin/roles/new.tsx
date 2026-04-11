import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Shield, Save } from "lucide-react";

export const Route = createFileRoute("/admin/roles/new")({
  component: CreateRoleRoute,
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

function CreateRoleRoute() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation(
    orpc.users.createRole.mutationOptions({
      onSuccess: (data) => {
        navigate({ to: `/admin/roles/${data.id}` });
      },
      onError: (error) => {
        setErrors({ submit: error.message });
      },
    }),
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Role name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Role name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const slug = formData.name.toLowerCase().replace(/\s+/g, "-");
    createMutation.mutate({
      organizationId: 1,
      name: formData.name,
      slug,
      description: formData.description,
      ticketViewScope: "all",
      createdBy: 1,
    });
  };

  const togglePermission = (permissionKey: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionKey)) {
      newPermissions.delete(permissionKey);
    } else {
      newPermissions.add(permissionKey);
    }
    setSelectedPermissions(newPermissions);
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
  };

  const isGroupAllSelected = (groupPermissions: { key: string }[]) => {
    return groupPermissions.every((p) => selectedPermissions.has(p.key));
  };

  const isGroupPartialSelected = (groupPermissions: { key: string }[]) => {
    const someSelected = groupPermissions.some((p) => selectedPermissions.has(p.key));
    const allSelected = groupPermissions.every((p) => selectedPermissions.has(p.key));
    return someSelected && !allSelected;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create Role</h1>
        <p className="text-muted-foreground mt-1">Define a new role and its permissions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Details
            </CardTitle>
            <CardDescription>Basic information about the role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Support Supervisor"
                hasError={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role is for..."
                className="h-24 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Select the permissions this role should have</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{group.name}</h4>
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
                  <div className="space-y-2">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedPermissions.has(permission.key)}
                          onCheckedChange={() => togglePermission(permission.key)}
                        />
                        <span className="text-sm">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {errors.submit && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
            {errors.submit}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link to="/admin/roles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </form>
    </div>
  );
}
