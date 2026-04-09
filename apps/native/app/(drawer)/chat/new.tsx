import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { View, Pressable, FlatList } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function NewChatScreen() {
  const router = useRouter();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const contacts = useQuery(orpc.contacts.list.queryOptions());
  const startChatMutation = useMutation(
    orpc.chatSessions.start.mutationOptions({
      onSuccess: (data) => {
        router.push(`/chat/${data.id}`);
      },
    }),
  );

  const handleStartChat = (contactId: number) => {
    startChatMutation.mutate({ contactId });
  };

  return (
    <Container>
      <View className="px-4 py-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          New Chat
        </Text>
        <Text className="text-muted text-sm">Select a contact to start a conversation</Text>
      </View>

      {contacts.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading contacts...</Text>
        </View>
      )}

      {contacts.data && contacts.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="people-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No contacts</Text>
            <Text className="text-muted text-xs mt-1">Add contacts to start chatting</Text>
          </Surface>
        </View>
      )}

      {contacts.data && contacts.data.length > 0 && (
        <FlatList
          data={contacts.data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="px-4 pb-4"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleStartChat(item.id)}>
              <Surface variant="secondary" className="p-4 rounded-lg">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                    <Text className="text-white font-medium">
                      {item.name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">{item.name}</Text>
                    <Text className="text-muted text-sm">{item.email}</Text>
                  </View>
                  <Ionicons name="chatbubble-outline" size={20} color={mutedColor} />
                </View>
              </Surface>
            </Pressable>
          )}
        />
      )}
    </Container>
  );
}
