import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Loader2, ArrowLeft, Calendar, CheckCircle } from "lucide-react";

import { useUserUpdate } from "@/hooks/users";
import { useConnectCalendar, useDisconnectCalendar } from "@/hooks/calendar";
import { getCurrentOrganizationId, getCurrentUserId } from "@/utils/auth";
import { useUser } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

export const Route = createFileRoute("/settings/profile")({
  loader: async ({ context }) => {
    return {
      user: context.orpc.users.me.queryOptions(),
      calendarConnections: context.orpc.calendar.listConnections.queryOptions({
        userId: getCurrentUserId()!,
      }),
    };
  },
  component: ProfileSettingsRoute,
});

function ProfileSettingsRoute() {
  const { user: userQueryOptions, calendarConnections: calendarQueryOptions } =
    Route.useLoaderData<(typeof Route)["loader"]>();
  const { data: user, isLoading } = useQuery(userQueryOptions);
  const { data: calendarConnections } = useQuery(calendarQueryOptions);

  const { organizationId } = useOrganization();
  const { user: authUser } = useUser();
  const currentUserId = authUser?.id ?? null;

  const [firstName, setFirstName] = useState(authUser?.firstName || "");
  const [lastName, setLastName] = useState(authUser?.lastName || "");
  const [displayName, setDisplayName] = useState(authUser?.displayName || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [phone, setPhone] = useState((authUser as any)?.phone || "");
  const [bio, setBio] = useState((authUser as any)?.bio || "");
  const [signature, setSignature] = useState((authUser as any)?.signature || "");
  const [timezone, setTimezone] = useState(authUser?.timezone || "UTC");
  const [locale, setLocale] = useState(authUser?.locale || "en");

  const connectCalendarMutation = useConnectCalendar();
  const disconnectCalendarMutation = useDisconnectCalendar();

  const updateMutation = useUserUpdate();

  const activeCalendarConnection = calendarConnections?.find((c: any) => c.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate({
      id: user?.id || currentUserId!,
      organizationId: organizationId || getCurrentOrganizationId()!,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      displayName: displayName.trim() || undefined,
      phone: phone.trim() || undefined,
      timezone: timezone || undefined,
      locale: locale || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Update your personal information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={authUser?.firstName || "John"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={authUser?.lastName || "Doe"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={authUser?.displayName || "johndoe"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authUser?.email || "john.doe@habib.cloud"}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bio & Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Best regards,&#10;John Doe"
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Localization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locale">Locale</Label>
                  <select
                    id="locale"
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2.5 py-1 text-xs"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded border">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">
                      {activeCalendarConnection
                        ? `Connected: ${activeCalendarConnection.calendarName}`
                        : "Create events from tickets and tasks"}
                    </p>
                  </div>
                </div>
                {activeCalendarConnection ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to disconnect your Google Calendar?")) {
                          disconnectCalendarMutation.mutate({
                            userId: currentUserId,
                            id: activeCalendarConnection.id,
                          });
                        }
                      }}
                      disabled={disconnectCalendarMutation.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectCalendarMutation.mutate({ userId: currentUserId })}
                    disabled={connectCalendarMutation.isPending}
                  >
                    {connectCalendarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4 mr-2" />
                    )}
                    Connect Calendar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
