import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link, useLocalSearchParams } from "expo-router";
import { View, FlatList } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function KBCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = parseInt(id, 10);
  const mutedColor = useThemeColor("muted");

  const category = useQuery(orpc.kbCategories.get.queryOptions({ id: categoryId }));
  const articles = useQuery(orpc.kbArticles.listByCategory.queryOptions({ categoryId }));

  const handleRefresh = async () => {
    await Promise.all([category.refetch(), articles.refetch()]);
    hapticImpact("light");
  };

  return (
    <Container onRefresh={handleRefresh} refreshing={articles.isFetching && !articles.isLoading}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight">
          {category.data?.name || "Category"}
        </Text>
        {category.data?.description && (
          <Text className="text-muted text-sm mt-1">{category.data.description}</Text>
        )}
      </View>

      {articles.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading articles...</Text>
        </View>
      )}

      {articles.data && articles.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="document-text-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No articles</Text>
            <Text className="text-muted text-xs mt-1">This category is empty</Text>
          </Surface>
        </View>
      )}

      {articles.data && articles.data.length > 0 && (
        <FlatList
          data={articles.data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="px-4 pb-4"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Link key={item.id} href={`/kb/article/${item.id}`} asChild>
              <Surface variant="secondary" className="p-4 rounded-lg">
                <View className="flex-row items-center gap-3">
                  <Ionicons name="document-text-outline" size={20} color={mutedColor} />
                  <View className="flex-1">
                    <Text className="text-foreground font-medium">{item.title}</Text>
                    <Text className="text-muted text-xs mt-1" numberOfLines={2}>
                      {item.excerpt || item.content?.substring(0, 100) || ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                </View>
              </Surface>
            </Link>
          )}
        />
      )}
    </Container>
  );
}
