import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Shield, Save, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/roles/id/")({
  component: EditRoleRoute,
});

function EditRoleRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roleId = Number(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: role, isLoading, refetch } = useQuery({
    queryKey: ["role", roleId],
    queryFn: () => orpc.users.getRole.query({ id: roleId }),
    enabled: !isNaN(roleId),
  });

  const updateMutation = useMutation(
    orpc.roles.update.mutationOptions({
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["roles"] });
      },
      onError: (error) => {
        setErrors({ submit: error.message });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrors({ name: "Role name is required" });
      return;
    }

    updateMutation.mutate({
      id: roleId,
      name: formData.name,
      description: formData.description,
    });
  };

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
          <Button asChild className="mt-4">
            <Link to="/admin/roles">Back to Roles</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (role.isSystem) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              System Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              <strong>{role.name}</strong> is a system role and cannot be edited.
              System roles are predefined roles that are essential to the operation of the platform.
            </p>
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link to="/admin/roles">Back to Roles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/roles">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Role</h1>
        <p className="text-muted-foreground mt-1">
          Update role details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {role.name}
          </CardTitle>
          <CardDescription>
            {role.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name || role.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Role name"
                hasError={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description !== undefined ? formData.description : role.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe what this role is for..."
                className="h-24 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                asChild
              >
                <Link to={`/admin/roles/${roleId}/permissions`}>
                  Manage Permissions
                </Link>
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link to="/admin/roles">Cancel</Link>
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
