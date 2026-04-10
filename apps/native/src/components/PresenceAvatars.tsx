import { Avatar } from "heroui-native";
import { Text, View } from "react-native";

import type { ViewerPresence } from "@ticket-app/socket-client";

interface PresenceAvatarsProps {
  viewers: ViewerPresence[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export function PresenceAvatars({ viewers, maxVisible = 4, size = "sm" }: PresenceAvatarsProps) {
  const visibleViewers = viewers.slice(0, maxVisible);
  const remainingCount = viewers.length - maxVisible;

  if (viewers.length === 0) {
    return null;
  }

  return (
    <View className="flex-row items-center">
      <View className="flex-row -space-x-2">
        {visibleViewers.map((viewer, index) => (
          <View
            key={viewer.userId}
            className="border-2 border-background rounded-full"
            style={{ zIndex: maxVisible - index }}
          >
            <Avatar size={size} color="accent" className="bg-accent-soft">
              <Avatar.Image source={{ uri: viewer.avatarUrl }} />
              <Avatar.Fallback delayMs={600}>{getInitials(viewer.userName)}</Avatar.Fallback>
            </Avatar>
          </View>
        ))}
        {remainingCount > 0 && (
          <View className="border-2 border-background rounded-full bg-muted justify-center items-center">
            <Avatar size={size} className="bg-muted">
              <Avatar.Fallback>
                <Text className="text-muted text-xs font-medium">+{remainingCount}</Text>
              </Avatar.Fallback>
            </Avatar>
          </View>
        )}
      </View>
    </View>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
