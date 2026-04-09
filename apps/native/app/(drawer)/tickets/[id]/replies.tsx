import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Divider,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, ScrollView } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function TicketRepliesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const ticket = useQuery(orpc.tickets.get.queryOptions({ id: ticketId }));
  const messages = useQuery(orpc.ticketMessages.list.queryOptions({ ticketId }));
  const replyMutation = useMutation(
    orpc.ticketMessages.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
        setReplyText("");
      },
    }),
  );

  const [replyText, setReplyText] = useState("");

  const handleReply = () => {
    if (replyText.trim()) {
      replyMutation.mutate({ ticketId, body: replyText, isPublic: true });
    }
  };

  if (messages.isLoading) {
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
      <View className="flex-1">
        <View className="p-4 border-b border-border">
          <Text className="text-lg font-semibold text-foreground">
            {ticket.data?.subject}
          </Text>
          <Text className="text-muted text-sm">
            {messages.data?.length || 0} messages
          </Text>
        </View>

        <ScrollView className="flex-1 p-4" contentContainerClassName="gap-3">
          {messages.data?.map((message) => (
            <Surface
              key={message.id}
              variant={message.isPublic ? "secondary" : "tertiary"}
              className="p-4 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={message.isPublic ? "person" : "headset"}
                    size={16}
                    color={mutedColor}
                  />
                  <Text className="text-foreground font-medium text-sm">
                    {message.isPublic ? "Customer" : "Agent"}
                  </Text>
                </View>
                <Text className="text-muted text-xs">
                  {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}
                </Text>
              </View>
              <Divider className="my-2" />
              <Text className="text-foreground text-sm leading-relaxed">
                {message.body}
              </Text>
            </Surface>
          ))}

          {messages.data?.length === 0 && (
            <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
              <Ionicons name="chatbox-ellipses-outline" size={40} color={mutedColor} />
              <Text className="text-foreground font-medium mt-3">No messages yet</Text>
              <Text className="text-muted text-xs mt-1">Start the conversation</Text>
            </Surface>
          )}
        </ScrollView>

        <View className="p-4 border-t border-border">
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField>
                <Input
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Type your reply..."
                  multiline
                  numberOfLines={2}
                />
              </TextField>
            </View>
            <Button
              variant="primary"
              isDisabled={!replyText.trim() || replyMutation.isPending}
              onPress={handleReply}
            >
              {replyMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Ionicons name="send" size={18} color={foregroundColor} />
              )}
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
}
