import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Divider, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { View } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function ProfileScreen() {
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const { data: user, isLoading, refetch } = useQuery(orpc.users.me.queryOptions());

  const handleRefresh = async () => {
    await refetch();
    hapticImpact("light");
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
    <Container onRefresh={handleRefresh} refreshing={isLoading}>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">Profile</Text>

        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <View className="items-center mb-4">
            <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-3">
              <Text className="text-white text-3xl font-medium">
                {user?.name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <Text className="text-xl font-semibold text-foreground">{user?.name}</Text>
            <Text className="text-muted text-sm">{user?.email}</Text>
          </View>

          <Divider className="my-4" />

          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="mail-outline" size={18} color={mutedColor} />
                <Text className="text-muted text-sm">Email</Text>
              </View>
              <Text className="text-foreground text-sm">{user?.email}</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="person-outline" size={18} color={mutedColor} />
                <Text className="text-muted text-sm">Role</Text>
              </View>
              <Text className="text-foreground text-sm">{user?.role || "User"}</Text>
            </View>

            {user?.phone && (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={18} color={mutedColor} />
                  <Text className="text-muted text-sm">Phone</Text>
                </View>
                <Text className="text-foreground text-sm">{user.phone}</Text>
              </View>
            )}
          </View>
        </Surface>

        <Link href="/settings" asChild>
          <Button variant="secondary" className="w-full" onPress={() => hapticImpact("light")}>
            <Ionicons name="settings-outline" size={18} color={foregroundColor} />
            <Text className="ml-2">Edit Profile</Text>
          </Button>
        </Link>
      </View>
    </Container>
  );
}
