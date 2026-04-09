import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { View, Pressable, Alert } from "react-native";

import { Container } from "@/components/container";
import { SwipeableRow } from "@/components/swipeable-row";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function ChatListScreen() {
  const sessions = useQuery(orpc.chatSessions.list.queryOptions());
  const mutedColor = useThemeColor("muted");

  const handleRefresh = async () => {
    await sessions.refetch();
    hapticImpact("light");
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "ended":
        return "default";
      default:
        return "default";
    }
  };

  const formatTime = (date: string | Date | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const handleEndChat = (sessionId: number) => {
    hapticImpact("medium");
    Alert.alert("End Chat", "Are you sure you want to end this chat session?", [
      { text: "Cancel", style: "cancel" },
      { text: "End Chat", style: "destructive", onPress: () => {} },
    ]);
  };

  return (
    <Container onRefresh={handleRefresh} refreshing={sessions.isFetching && !sessions.isLoading}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-semibold text-foreground tracking-tight">Chat</Text>
          <Link href="/chat/new" asChild>
            <Pressable className="flex-row items-center gap-1" onPress={() => hapticImpact("light")}>
              <Ionicons name="add-circle-outline" size={24} color={mutedColor} />
            </Pressable>
          </Link>
        </View>
      </View>

      {sessions.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading chats...</Text>
        </View>
      )}

      {sessions.data && sessions.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="chatbubbles-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No active chats</Text>
            <Text className="text-muted text-xs mt-1">Start a new conversation</Text>
          </Surface>
        </View>
      )}

      {sessions.data && sessions.data.length > 0 && (
        <View className="px-4 pb-4 gap-3">
          {sessions.data.map((session) => (
            <SwipeableRow
              key={session.id}
              rightActions={[
                {
                  icon: "chatbubbles-outline",
                  color: "#007AFF",
                  onPress: () => {
                    hapticImpact("light");
                  },
                },
                ...(session.status === "active"
                  ? [
                      {
                        icon: "close-circle-outline",
                        color: "#FF3B30",
                        onPress: () => handleEndChat(session.id),
                      } as const,
                    ]
                  : []),
              ]}
              onLongPress={() => {
                hapticImpact("heavy");
                Alert.alert(
                  session.contact?.name || "Unknown Contact",
                  "Chat options",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "View Chat", onPress: () => {} },
                    ...(session.status === "active"
                      ? [{ text: "End Chat", style: "destructive" as const, onPress: () => handleEndChat(session.id) }]
                      : []),
                  ],
                );
              }}
            >
              <Link href={`/chat/${session.id}`} asChild>
                <Pressable>
                  <Surface variant="secondary" className="p-4 rounded-lg">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                        <Ionicons name="person" size={20} color="white" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground font-medium text-sm">
                            {session.contact?.name || "Unknown Contact"}
                          </Text>
                          <Text className="text-muted text-xs">
                            {formatTime(session.updatedAt)}
                          </Text>
                        </View>
                        <Text className="text-muted text-sm mt-1" numberOfLines={1}>
                          {session.lastMessage || "No messages yet"}
                        </Text>
                      </View>
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
