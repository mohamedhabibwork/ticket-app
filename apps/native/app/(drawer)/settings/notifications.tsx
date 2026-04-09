import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch, Divider, Spinner, Surface, Text, Button, useThemeColor } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

interface NotificationToggleProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function NotificationToggle({ title, description, value, onValueChange }: NotificationToggleProps) {
  const foregroundColor = useThemeColor("foreground");

  return (
    <Surface variant="secondary" className="p-4 rounded-lg mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-foreground font-medium">{title}</Text>
          <Text className="text-muted text-xs mt-0.5">{description}</Text>
        </View>
        <Switch
          isSelected={value}
          onValueChange={(newValue) => {
            hapticImpact("light");
            onValueChange(newValue);
          }}
        />
      </View>
    </Surface>
  );
}

export default function NotificationSettingsScreen() {
  const foregroundColor = useThemeColor("foreground");

  const { data: settings, isLoading } = useQuery(orpc.users.getNotificationSettings.queryOptions());
  const updateMutation = useMutation(orpc.users.updateNotificationSettings.mutationOptions());

  const handleToggle = (key: string, value: boolean) => {
    hapticImpact("medium");
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Notifications
        </Text>
        <Text className="text-muted text-sm mb-4">Manage how you receive notifications</Text>

        <Text className="text-muted text-xs font-medium mb-2 px-1">TICKET NOTIFICATIONS</Text>
        <NotificationToggle
          title="New Tickets"
          description="Get notified when new tickets are assigned"
          value={settings?.newTickets ?? true}
          onValueChange={(v) => handleToggle("newTickets", v)}
        />
        <NotificationToggle
          title="Ticket Updates"
          description="Get notified when tickets are updated"
          value={settings?.ticketUpdates ?? true}
          onValueChange={(v) => handleToggle("ticketUpdates", v)}
        />
        <NotificationToggle
          title="Ticket Replies"
          description="Get notified on new ticket replies"
          value={settings?.ticketReplies ?? true}
          onValueChange={(v) => handleToggle("ticketReplies", v)}
        />

        <Text className="text-muted text-xs font-medium mb-2 px-1 mt-4">CHAT NOTIFICATIONS</Text>
        <NotificationToggle
          title="New Messages"
          description="Get notified on new chat messages"
          value={settings?.newMessages ?? true}
          onValueChange={(v) => handleToggle("newMessages", v)}
        />
        <NotificationToggle
          title="Chat Requests"
          description="Get notified on new chat requests"
          value={settings?.chatRequests ?? true}
          onValueChange={(v) => handleToggle("chatRequests", v)}
        />

        <Text className="text-muted text-xs font-medium mb-2 px-1 mt-4">SYSTEM NOTIFICATIONS</Text>
        <NotificationToggle
          title="System Alerts"
          description="Get notified about system updates"
          value={settings?.systemAlerts ?? true}
          onValueChange={(v) => handleToggle("systemAlerts", v)}
        />
        <NotificationToggle
          title="Marketing"
          description="Receive marketing emails and updates"
          value={settings?.marketing ?? false}
          onValueChange={(v) => handleToggle("marketing", v)}
        />
      </View>
    </Container>
  );
}
