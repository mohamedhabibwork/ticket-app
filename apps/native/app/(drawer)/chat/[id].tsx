import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { View, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<View>(null);
  const foregroundColor = useThemeColor("foreground");
  const mutedColor = useThemeColor("muted");

  const session = useQuery(orpc.chatSessions.get.queryOptions({ id: sessionId }));
  const messages = useQuery(orpc.chatMessages.list.queryOptions({ sessionId }));
  const sendMutation = useMutation(
    orpc.chatMessages.send.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chatMessages", sessionId] });
        setMessageText("");
        hapticNotification("success");
      },
      onError: () => {
        hapticNotification("error");
      },
    }),
  );

  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [messages.data]);

  const scrollToEnd = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", scrollToEnd);
    return () => keyboardDidShowListener.remove();
  }, [scrollToEnd]);

  const handleSend = () => {
    if (messageText.trim()) {
      hapticImpact("light");
      sendMutation.mutate({ sessionId, content: messageText });
    }
  };

  if (session.isLoading) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  return (
    <Container isScrollable={false}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View className="flex-1">
          <View className="p-4 border-b border-border">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
                <Ionicons name="person" size={20} color="white" />
              </View>
              <View>
                <Text className="text-foreground font-medium">
                  {session.data?.contact?.name || "Chat"}
                </Text>
                <Text className="text-muted text-xs">
                  {session.data?.status === "active" ? "Active now" : "Ended"}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1 p-4"
            contentContainerClassName="gap-3 pb-2"
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {messages.data?.map((message) => (
              <View
                key={message.id}
                className={`flex-row ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}
              >
                <Surface
                  variant="secondary"
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.direction === "inbound"
                      ? "rounded-tl-sm"
                      : "rounded-tr-sm bg-primary"
                  }`}
                >
                  <Text
                    className={`text-sm ${message.direction === "inbound" ? "text-foreground" : "text-white"}`}
                  >
                    {message.content}
                  </Text>
                  <View className="flex-row items-center justify-end mt-1">
                    <Text
                      className={`text-xs ${message.direction === "inbound" ? "text-muted" : "text-white/70"}`}
                    >
                      {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ""}
                    </Text>
                  </View>
                </Surface>
              </View>
            ))}

            {messages.data?.length === 0 && (
              <View className="flex-1 justify-center items-center py-8">
                <Ionicons name="chatbubbles-outline" size={40} color={mutedColor} />
                <Text className="text-muted text-sm mt-3">No messages yet</Text>
              </View>
            )}
          </ScrollView>

          <View className="p-4 border-t border-border" style={{ minHeight: 60 }}>
            <View className="flex-row items-end gap-2">
              <View className="flex-1" ref={inputRef}>
                <TextField>
                  <Input
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                </TextField>
              </View>
              <Button
                variant="primary"
                isDisabled={!messageText.trim() || sendMutation.isPending}
                onPress={handleSend}
                className="min-w-[44px] min-h-[44px]"
              >
                {sendMutation.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Ionicons name="send" size={18} color={foregroundColor} />
                )}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}
