import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@ticket-app/ui/components/button";
import { Checkbox } from "@ticket-app/ui/components/checkbox";

import { Card, CardContent, CardHeader, CardTitle } from "@ticket-app/ui/components/card";
import { Loader2, ArrowLeft, Mail, Monitor, Bell } from "lucide-react";

export const Route = createFileRoute("/settings/notifications")({
  component: NotificationSettingsRoute,
});

function NotificationSettingsRoute() {
  const _queryClient = useQueryClient();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [preferences, setPreferences] = useState({
    ticketAssigned: true,
    ticketUpdated: true,
    mentionedInNote: true,
    slaWarning: true,
    slaBreached: true,
    newChat: true,
    chatEnded: false,
  });

  const updateMutation = useMutation({
    mutationFn: async (_data: typeof preferences) => {
      return true;
    },
    onSuccess: () => {
      toast.success("Notification preferences saved");
    },
    onError: (error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    },
  });

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(preferences);
  };

  const notificationEvents = [
    {
      key: "ticketAssigned",
      label: "New ticket assigned to me",
      description: "Get notified when a ticket is assigned to you",
    },
    {
      key: "ticketUpdated",
      label: "Ticket updated",
      description: "Get notified when a ticket you're watching is updated",
    },
    {
      key: "mentionedInNote",
      label: "Mentioned in a note",
      description: "Get notified when someone mentions you in a ticket note",
    },
    {
      key: "slaWarning",
      label: "SLA warning",
      description: "Get notified when a ticket is approaching its SLA deadline",
    },
    {
      key: "slaBreached",
      label: "SLA breached",
      description: "Get notified when a ticket has breached its SLA",
    },
    {
      key: "newChat",
      label: "New chat request",
      description: "Get notified when a new chat session is waiting",
    },
    {
      key: "chatEnded",
      label: "Chat ended",
      description: "Get notified when a chat session has ended",
    },
  ];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">Configure how you receive notifications</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={(checked) => setEmailNotifications(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </div>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  id="desktopNotifications"
                  checked={desktopNotifications}
                  onCheckedChange={(checked) => setDesktopNotifications(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Desktop Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </div>
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Event Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationEvents.map((event) => (
                <label
                  key={event.key}
                  className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-muted"
                >
                  <Checkbox
                    id={event.key}
                    checked={preferences[event.key as keyof typeof preferences]}
                    onCheckedChange={() => handleToggle(event.key as keyof typeof preferences)}
                  />
                  <div>
                    <div className="font-medium">{event.label}</div>
                    <div className="text-sm text-muted-foreground">{event.description}</div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
