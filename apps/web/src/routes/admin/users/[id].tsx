import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@ticket-app/ui/components/dropdown-menu";
import { orpc } from "@/utils/orpc";
import { ArrowLeft, Mail, Phone, Globe, Clock, Shield, Monitor, Trash2, Edit, UserX, UserCheck, Key } from "lucide-react";

export const Route = createFileRoute("/admin/users/id")({
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    timezone: "",
    locale: "",
    roleIds: [] as number[],
  });

  const userId = Number(id);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => orpc.users.get.query({ organizationId: 1, id: userId }),
    enabled: !isNaN(userId),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: () => orpc.users.listRoles.query({ organizationId: 1 }),
  });

  const { data: sessions } = useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => orpc.users.listSessions.query({ userId }),
    enabled: !!user,
  });

  const { data: userTickets } = useQuery({
    queryKey: ["userTickets", userId],
    queryFn: () => orpc.tickets.list.query({ assignedAgentId: userId, limit: 10 }),
    enabled: !!user,
  });

  const updateMutation = useMutation(
    orpc.users.update.mutationOptions({
      onSuccess: () => {
        setIsEditing(false);
        refetch();
      },
    })
  );

  const deactivateMutation = useMutation(
    orpc.users.delete.mutationOptions({
      onSuccess: () => {
        navigate({ to: "/admin/users" });
      },
    })
  );

  const revokeSessionMutation = useMutation(
    orpc.users.revokeSession.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const startEditing = () => {
    if (user) {
      setEditData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        timezone: user.timezone || "",
        locale: user.locale || "",
        roleIds: user.roles?.map((ur: any) => ur.roleId) || [],
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: userId,
      organizationId: 1,
      firstName: editData.firstName,
      lastName: editData.lastName,
      email: editData.email,
      phone: editData.phone || undefined,
      timezone: editData.timezone || undefined,
      locale: editData.locale || undefined,
      roleIds: editData.roleIds,
    });
  };

  const handleDeactivate = () => {
    if (confirm("Are you sure you want to deactivate this user? They will be logged out immediately.")) {
      deactivateMutation.mutate({ id: userId, organizationId: 1 });
    }
  };

  const handleActivate = () => {
    updateMutation.mutate({
      id: userId,
      organizationId: 1,
      isActive: true,
    });
  };

  const handleRevokeSession = (sessionId: number) => {
    revokeSessionMutation.mutate({ sessionId, userId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">User not found</h1>
          <Button asChild className="mt-4">
            <Link to="/admin/users">Back to Users</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getRoleName = (user: any) => {
    if (!user.roles || user.roles.length === 0) return "No role";
    return user.roles.map((ur: any) => ur.role.name).join(", ");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0">
          <Link to="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xl font-medium">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-1 bg-muted rounded text-xs">
                  {getRoleName(user)}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    user.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEditing}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {user.isActive ? (
                  <Button variant="destructive" onClick={handleDeactivate}>
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button onClick={handleActivate}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activate
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editData.firstName}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editData.lastName}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone</Label>
                    <Input
                      id="editPhone"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTimezone">Timezone</Label>
                    <Input
                      id="editTimezone"
                      value={editData.timezone}
                      onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLocale">Locale</Label>
                    <Input
                      id="editLocale"
                      value={editData.locale}
                      onChange={(e) => setEditData({ ...editData, locale: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Roles</Label>
                    <div className="flex flex-wrap gap-2">
                      {rolesData?.map((role: any) => (
                        <label
                          key={role.id}
                          className={`flex items-center gap-2 px-3 py-2 border rounded cursor-pointer ${
                            editData.roleIds.includes(role.id)
                              ? "border-primary bg-primary/5"
                              : "border-input"
                          }`}
                        >
                          <Checkbox
                            checked={editData.roleIds.includes(role.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditData({
                                  ...editData,
                                  roleIds: [...editData.roleIds, role.id],
                                });
                              } else {
                                setEditData({
                                  ...editData,
                                  roleIds: editData.roleIds.filter((id) => id !== role.id),
                                });
                              }
                            }}
                          />
                          {role.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div>{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div>{user.phone || "Not set"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Timezone</div>
                      <div>{user.timezone || "Not set"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Locale</div>
                      <div>{user.locale || "Not set"}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned Tickets</CardTitle>
              <CardDescription>Recent tickets assigned to this user</CardDescription>
            </CardHeader>
            <CardContent>
              {userTickets?.tickets && userTickets.tickets.length > 0 ? (
                <div className="space-y-3">
                  {userTickets.tickets.slice(0, 5).map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{ticket.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          #{ticket.referenceNumber}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          ticket.status === "open"
                            ? "bg-blue-100 text-blue-800"
                            : ticket.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tickets assigned
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session: any) => (
                    <div key={session.id} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">Active</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>{session.deviceType || "Unknown device"}</div>
                        <div>{session.ipAddress}</div>
                        <div>
                          Last active:{" "}
                          {session.lastActivityAt
                            ? new Date(session.lastActivityAt).toLocaleString()
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No active sessions
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono">{user.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Seen</span>
                <span>
                  {user.lastSeenAt
                    ? new Date(user.lastSeenAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
