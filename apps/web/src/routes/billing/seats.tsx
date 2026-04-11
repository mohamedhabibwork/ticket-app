import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@ticket-app/ui/components/card";
import { Button } from "@ticket-app/ui/components/button";
import { Badge } from "@ticket-app/ui/components/badge";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Mail,
  Clock,
  X,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

interface SeatUser {
  id: number;
  userId: number;
  role: string;
  addedAt: string;
  removedAt?: string;
  user?: {
    id: number;
    uuid: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    lastActiveAt?: string;
  };
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
}

export default function SeatManagementPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const queryClient = useQueryClient();

  const { data: subscription, isLoading }: any = useQuery(
    orpc.subscriptions.get.queryOptions({ organizationId: 1 } as any),
  );

  const { data: seats }: any = useQuery(
    orpc.subscriptions.getSeats.queryOptions({ organizationId: 1 } as any),
  );

  const { data: pendingInvitations }: any = useQuery(
    orpc.subscriptions.getPendingInvitations.queryOptions({ organizationId: 1 } as any),
  );

  const inviteMutation = useMutation(
    orpc.users.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
        setIsInviteOpen(false);
        setEmail("");
        setRole("agent");
      },
    }),
  );

  const removeSeatMutation = useMutation(
    orpc.subscriptions.removeSeat.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
        queryClient.invalidateQueries({ queryKey: ["seats"] });
      },
    }),
  );

  const resendInvitationMutation = useMutation(
    orpc.users.resendInvitation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      },
    }),
  );

  const cancelInvitationMutation = useMutation(
    orpc.users.cancelInvitation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      },
    }),
  );

  const addSeatsMutation = useMutation(
    orpc.subscriptions.addSeats.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      },
    }),
  );

  const currentSeats: SeatUser[] = seats || [];
  const activeSeats = currentSeats.filter((s) => !s.removedAt);
  const pendingList: PendingInvitation[] = pendingInvitations || [];

  const agentCount = subscription?.agentCount || activeSeats.length;
  const maxAgents = subscription?.maxAgents || 3;
  const isUnlimited = maxAgents === -1;
  const seatsAvailable = isUnlimited ? Infinity : maxAgents - agentCount;
  const isAtLimit = !isUnlimited && seatsAvailable <= 0;

  const planLimits: Record<string, { agents: number; name: string }> = {
    free: { agents: 3, name: "Free" },
    starter: { agents: 10, name: "Starter" },
    professional: { agents: 50, name: "Professional" },
    enterprise: { agents: -1, name: "Enterprise" },
  };

  const currentPlan = subscription?.plan?.slug || "free";
  const _currentPlanLimits = planLimits[currentPlan] || planLimits.free;

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <Link to="/billing">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seat Management</h1>
            <p className="text-muted-foreground mt-1">Manage your team's seats and invitations</p>
          </div>
          <Link to="/billing/upgrade">
            <Button>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Active Users</div>
                <div className="text-2xl font-bold">
                  {agentCount} {isUnlimited ? "" : `/ ${maxAgents}`}
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            {isAtLimit && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Seat limit reached
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Available Seats
                </div>
                <div className="text-2xl font-bold">{isUnlimited ? "∞" : seatsAvailable}</div>
              </div>
              <UserPlus className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            {!isUnlimited && (
              <p className="text-xs text-muted-foreground mt-1">
                {seatsAvailable > 0 ? `${seatsAvailable} seats remaining` : "No seats available"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Pending Invitations
                </div>
                <div className="text-2xl font-bold">{pendingList.length}</div>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Invited but not yet accepted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to your support workspace</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsInviteOpen(true)} disabled={isAtLimit}>
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : currentSeats.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div>Name</div>
                <div>Email</div>
                <div>Role</div>
                <div className="text-right">Actions</div>
              </div>
              {currentSeats.map((seat) => (
                <div
                  key={seat.id}
                  className="grid grid-cols-4 gap-4 items-center py-3 border-b last:border-0"
                >
                  <div className="font-medium">
                    {seat.user?.displayName ||
                      `${seat.user?.firstName || ""} ${seat.user?.lastName || ""}`.trim() ||
                      "Unknown"}
                  </div>
                  <div className="text-sm text-muted-foreground">{seat.user?.email || "N/A"}</div>
                  <div>
                    <Badge variant="secondary">{seat.role || "agent"}</Badge>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatLastActive(seat.user?.lastActiveAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        removeSeatMutation.mutateAsync({ organizationId: 1, userId: seat.userId })
                      }
                      disabled={removeSeatMutation.isPending}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm mt-1">Invite your first team member to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingList.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Invited as {invitation.role} •{" "}
                      {new Date(invitation.invitedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        resendInvitationMutation.mutateAsync({
                          organizationId: 1,
                          invitationId: invitation.id,
                        })
                      }
                      disabled={resendInvitationMutation.isPending}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        cancelInvitationMutation.mutateAsync({
                          organizationId: 1,
                          invitationId: invitation.id,
                        })
                      }
                      disabled={cancelInvitationMutation.isPending}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAtLimit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Seat Limit Reached</p>
                  <p className="text-sm text-amber-700">
                    You've reached your seat limit of {maxAgents}. Upgrade your plan or remove users
                    to add more team members.
                  </p>
                </div>
              </div>
              <Link to="/billing/upgrade">
                <Button variant="outline" className="border-amber-300 bg-white">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!isUnlimited && seatsAvailable <= 5 && seatsAvailable > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">Running Low on Seats</p>
                <p className="text-sm text-blue-700">
                  Only {seatsAvailable} seats remaining. Consider upgrading for more capacity.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-blue-300"
                onClick={() => addSeatsMutation.mutateAsync({ organizationId: 1, seatCount: 5 })}
                disabled={addSeatsMutation.isPending}
              >
                Purchase 5 More Seats - $25/mo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Invite Team Member</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsInviteOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Send an invitation to add a new team member
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="agent@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <select
                  id="inviteRole"
                  className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => inviteMutation.mutateAsync({ organizationId: 1, email, role })}
                disabled={!email || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
