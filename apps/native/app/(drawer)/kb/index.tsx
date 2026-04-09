import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, TextField, Input, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function KBHomeScreen() {
  const categories = useQuery(orpc.kbCategories.list.queryOptions());
  const mutedColor = useThemeColor("muted");

  const handleRefresh = async () => {
    await categories.refetch();
    hapticImpact("light");
  };

  return (
    <Container onRefresh={handleRefresh} refreshing={categories.isFetching && !categories.isLoading}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">
          Help Center
        </Text>

        <Link href="/kb/search" asChild>
          <Pressable onPress={() => hapticImpact("light")}>
            <Surface variant="secondary" className="p-3 rounded-lg">
              <View className="flex-row items-center gap-2">
                <Ionicons name="search" size={18} color={mutedColor} />
                <Text className="text-muted text-sm">Search articles...</Text>
              </View>
            </Surface>
          </Pressable>
        </Link>
      </View>

      {categories.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading...</Text>
        </View>
      )}

      {categories.data && categories.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="book-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No categories</Text>
            <Text className="text-muted text-xs mt-1">Check back later</Text>
          </Surface>
        </View>
      )}

      {categories.data && categories.data.length > 0 && (
        <View className="px-4 pb-4 gap-3">
          {categories.data.map((category) => (
            <Link key={category.id} href={`/kb/${category.id}`} asChild>
              <Pressable onPress={() => hapticImpact("light")}>
                <Surface variant="secondary" className="p-4 rounded-lg">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-lg bg-primary/10 items-center justify-center">
                      <Ionicons name="folder-outline" size={24} color={mutedColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-medium">{category.name}</Text>
                      <Text className="text-muted text-sm" numberOfLines={2}>
                        {category.description || "Browse articles"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                  </View>
                </Surface>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </Container>
  );
}
