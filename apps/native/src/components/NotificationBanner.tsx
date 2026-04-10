import { useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Surface, Text, useThemeColor } from "heroui-native";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hapticNotification } from "@/utils/haptics";
import type { NotificationPayload } from "@ticket-app/socket-client";

interface NotificationBannerProps {
  notification: NotificationPayload | null;
  onDismiss: () => void;
  onPress?: (notification: NotificationPayload) => void;
}

export function NotificationBanner({ notification, onDismiss, onPress }: NotificationBannerProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const accentColor = useThemeColor("accent");
  const backgroundColor = useThemeColor("background");
  const foregroundColor = useThemeColor("foreground");

  useEffect(() => {
    if (notification) {
      hapticNotification("success");
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-100, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [notification, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePress = useCallback(() => {
    if (notification && onPress) {
      onPress(notification);
    } else if (notification?.ticketId) {
      onDismiss();
    }
  }, [notification, onPress, onDismiss]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250 }, () => {
      runOnJS(onDismiss)();
    });
    opacity.value = withTiming(0, { duration: 200 });
  }, [onDismiss, translateY, opacity]);

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 1000,
        },
      ]}
    >
      <Surface variant="secondary" className="p-4 rounded-xl shadow-lg" style={{ backgroundColor }}>
        <View className="flex-row items-start gap-3">
          <View className="bg-accent rounded-full p-2">
            <Ionicons name="notifications" size={20} color={accentColor} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-semibold text-sm">{notification.title}</Text>
            <Text className="text-muted text-xs mt-1">{notification.body}</Text>
          </View>
          <Button variant="ghost" isIconOnly size="sm" onPress={handleDismiss}>
            <Ionicons name="close" size={16} color={foregroundColor} />
          </Button>
        </View>
        {notification.ticketId && (
          <Button variant="primary" size="sm" className="mt-3" onPress={handlePress}>
            <Button.Label>View Ticket</Button.Label>
          </Button>
        )}
      </Surface>
    </Animated.View>
  );
}
