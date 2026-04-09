import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link, useRouter } from "expo-router";
import { View, Pressable, FlatList } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function TeamManagementScreen() {
  const router = useRouter();
  const mutedColor = useThemeColor("muted");

  const teams = useQuery(orpc.teams.list.queryOptions());

  return (
    <Container>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-semibold text-foreground tracking-tight">
            Teams
          </Text>
          <Pressable>
            <Ionicons name="add-circle-outline" size={28} color={mutedColor} />
          </Pressable>
        </View>

        <Text className="text-muted text-sm mb-4">Manage your support teams</Text>
      </View>

      {teams.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading teams...</Text>
        </View>
      )}

      {teams.data && teams.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="people-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No teams yet</Text>
            <Text className="text-muted text-xs mt-1">Create your first team</Text>
          </Surface>
        </View>
      )}

      {teams.data && teams.data.length > 0 && (
        <FlatList
          data={teams.data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="px-4 pb-4"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/admin/teams/${item.id}`)}>
              <Surface variant="secondary" className="p-4 rounded-lg">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-lg bg-primary/10 items-center justify-center">
                    <Ionicons name="people" size={24} color={mutedColor} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">{item.name}</Text>
                    <Text className="text-muted text-sm">
                      {item.members?.length || 0} members
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                </View>
              </Surface>
            </Pressable>
          )}
        />
      )}
    </Container>
  );
}
