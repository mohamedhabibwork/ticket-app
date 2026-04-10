import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Divider, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { View, Pressable, Alert } from "react-native";

import { Container } from "@/components/container";
import { SwipeableRow } from "@/components/swipeable-row";
import { hapticNotification, hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function TicketListScreen() {
  const queryClient = useQueryClient();
  const tickets = useQuery(orpc.tickets.list.queryOptions());
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const updateMutation = useMutation(
    orpc.tickets.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        hapticNotification("success");
      },
    }),
  );

  const handleRefresh = async () => {
    await tickets.refetch();
    hapticImpact("light");
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "primary";
      case "pending":
        return "warning";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "primary";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const handleQuickReply = (_ticketId: number) => {
    hapticImpact("medium");
    Alert.alert("Quick Reply", "Open reply composer for this ticket", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reply",
        onPress: () => {
          // Navigate to ticket detail with reply focus
        },
      },
    ]);
  };

  const handleMarkPriority = (ticketId: number, priority: string) => {
    hapticImpact("medium");
    updateMutation.mutate({ id: ticketId, priority });
  };

  return (
    <Container onRefresh={handleRefresh} refreshing={tickets.isFetching && !tickets.isLoading}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-semibold text-foreground tracking-tight">Tickets</Text>
          <Link href="/tickets/new" asChild>
            <Button variant="primary" size="sm" onPress={() => hapticImpact("light")}>
              <Ionicons name="add" size={18} color={foregroundColor} />
              <Text className="text-sm font-medium ml-1">New</Text>
            </Button>
          </Link>
        </View>

        <Link href="/tickets/search" asChild>
          <Surface variant="secondary" className="p-3 rounded-lg mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="search" size={18} color={mutedColor} />
              <Text className="text-muted text-sm">Search tickets...</Text>
            </View>
          </Surface>
        </Link>
      </View>

      {tickets.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading tickets...</Text>
        </View>
      )}

      {tickets.data && tickets.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="ticket-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No tickets yet</Text>
            <Text className="text-muted text-xs mt-1">Create your first ticket</Text>
          </Surface>
        </View>
      )}

      {tickets.data && tickets.data.length > 0 && (
        <View className="px-4 pb-4 gap-3">
          {tickets.data.map((ticket) => (
            <SwipeableRow
              key={ticket.id}
              rightActions={[
                {
                  icon: "chatbubble-outline",
                  color: "#007AFF",
                  onPress: () => handleQuickReply(ticket.id),
                },
                {
                  icon: "flag-outline",
                  color: "#FF9500",
                  onPress: () =>
                    handleMarkPriority(ticket.id, ticket.priority === "urgent" ? "low" : "urgent"),
                },
              ]}
              onLongPress={() => {
                hapticImpact("heavy");
                Alert.alert(ticket.subject, `Ticket ${ticket.reference}`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "View", onPress: () => {} },
                  { text: "Reply", onPress: () => handleQuickReply(ticket.id) },
                ]);
              }}
            >
              <Link href={`/tickets/${ticket.id}`} asChild>
                <Pressable>
                  <Surface variant="secondary" className="p-4 rounded-lg">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text className="text-foreground font-medium text-sm">
                          {ticket.reference}
                        </Text>
                        <Text className="text-foreground mt-1" numberOfLines={1}>
                          {ticket.subject}
                        </Text>
                      </View>
                      <Chip variant="flat" color={getStatusColor(ticket.status)} size="sm">
                        <Chip.Label className="text-xs">{ticket.status}</Chip.Label>
                      </Chip>
                    </View>
                    <Divider className="my-2" />
                    <View className="flex-row items-center justify-between">
                      <Chip variant="flat" color={getPriorityColor(ticket.priority)} size="sm">
                        <Chip.Label className="text-xs">{ticket.priority}</Chip.Label>
                      </Chip>
                      <Text className="text-muted text-xs">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}
                      </Text>
                    </View>
                  </Surface>
                </Pressable>
              </Link>
            </SwipeableRow>
          ))}
        </View>
      )}
    </Container>
  );
}
