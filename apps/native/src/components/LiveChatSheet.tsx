import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Button, Input, Surface, Text, useThemeColor } from "heroui-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Keyboard, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ChatMessage } from "@ticket-app/socket-client";

interface LiveChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isTyping: { agent: boolean; contact: boolean };
  onSendMessage: (body: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  sessionId: number;
}

export function LiveChatSheet({
  isOpen,
  onClose,
  messages,
  isTyping,
  onSendMessage,
  onSendTyping,
  sessionId: _sessionId,
}: LiveChatSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [inputText, setInputText] = useState("");
  const _insets = useSafeAreaInsets();
  const foregroundColor = useThemeColor("foreground");
  const mutedColor = useThemeColor("muted");

  const snapPoints = useMemo(() => ["50%", "90%"], []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
      onSendTyping(false);
      Keyboard.dismiss();
    }
  }, [inputText, onSendMessage, onSendTyping]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      onSendTyping(text.length > 0);
    },
    [onSendTyping],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    const isAgent = message.authorType === "agent";
    return (
      <View
        key={message.id || index}
        className={`flex-row mb-3 ${isAgent ? "justify-end" : "justify-start"}`}
      >
        <View className={`max-w-[80%] flex-row gap-2 ${isAgent ? "flex-row-reverse" : ""}`}>
          {!isAgent && (
            <Avatar size="sm" className="bg-accent">
              <Avatar.Fallback>{message.authorName?.[0] ?? "U"}</Avatar.Fallback>
            </Avatar>
          )}
          <Surface variant={isAgent ? "secondary" : "tertiary"} className="p-3 rounded-2xl">
            <Text className="text-foreground text-sm">{message.body}</Text>
            <Text className="text-muted text-xs mt-1">{formatTime(message.createdAt)}</Text>
          </Surface>
        </View>
      </View>
    );
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: useThemeColor("background"),
      }}
      handleIndicatorStyle={{ backgroundColor: mutedColor }}
    >
      <BottomSheetView className="flex-1 px-4 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground font-semibold text-lg">Live Chat</Text>
          <Button variant="ghost" isIconOnly size="sm" onPress={onClose}>
            <Ionicons name="close" size={20} color={foregroundColor} />
          </Button>
        </View>

        <View className="flex-1">
          {messages.map(renderMessage)}

          {isTyping.agent && (
            <View className="flex-row items-center gap-2 mb-3">
              <Avatar size="sm" className="bg-accent">
                <Avatar.Fallback>A</Avatar.Fallback>
              </Avatar>
              <Surface variant="tertiary" className="px-4 py-2 rounded-2xl">
                <Text className="text-muted text-sm">Agent is typing...</Text>
              </Surface>
            </View>
          )}
        </View>

        <View className="pt-3 border-t border-border">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Input
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                variant="bordered"
                size="sm"
              />
            </View>
            <Button variant="primary" size="sm" onPress={handleSend} isDisabled={!inputText.trim()}>
              <Ionicons name="send" size={16} color={foregroundColor} />
            </Button>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
