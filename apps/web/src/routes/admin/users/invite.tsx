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
import { ArrowLeft, Mail, Send, User, Shield } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { getCurrentOrganizationId } from "@/utils/auth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/admin/users/invite")({
  loader: async ({ context }) => {
    const rolesData = await context.orpc.users.listRoles.query({
      organizationId: getCurrentOrganizationId()!,
    });
    return { rolesData };
  },
  component: InviteUserRoute,
});

function InviteUserRoute() {
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    roleId: undefined as number | undefined,
    sendWelcomeEmail: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { rolesData } = Route.useLoaderData<typeof Route>();

  const inviteMutation = useMutation(
    orpc.users.create.mutationOptions({
      onSuccess: () => {
        navigate({ to: "/admin/users" });
      },
      onError: (error: { message: string }) => {
        setErrors({ submit: error.message });
      },
    }),
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    inviteMutation.mutate({
      organizationId,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      roleIds: formData.roleId ? [formData.roleId] : undefined,
      sendWelcomeEmail: formData.sendWelcomeEmail,
    } as any);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
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
        <Link to="/admin/users">
          <Button variant="ghost" className="mb-4 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Invite User</h1>
        <p className="text-muted-foreground mt-1">Send an invitation to join your organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>Enter the details of the user you want to invite</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="John"
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.doe@habib.cloud"
                  className="pl-9"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <div className="relative">
                <Shield className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <select
                  id="role"
                  value={formData.roleId || ""}
                  onChange={(e) =>
                    handleChange(
                      "roleId",
                      e.target.value ? Number(e.target.value) : (undefined as any),
                    )
                  }
                  className="h-8 w-full min-w-0 rounded-none border border-input bg-transparent pl-9 pr-2.5 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                >
                  <option value="">Select a role</option>
                  {rolesData?.map((role: any) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.isSystem ? " (System)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                You can change the role after inviting the user
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendWelcomeEmail"
                  checked={formData.sendWelcomeEmail}
                  onCheckedChange={(checked) =>
                    handleChange("sendWelcomeEmail", checked as boolean)
                  }
                />
                <Label htmlFor="sendWelcomeEmail" className="font-normal cursor-pointer">
                  Send welcome email with login instructions
                </Label>
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                {errors.submit}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Link to="/admin/users">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
