import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { useLocalSearchParams } from "expo-router";
import { View, ScrollView } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function KBArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const article = useQuery(orpc.kbArticles.get.queryOptions({ id: articleId }));
  const rateMutation = useMutation(
    orpc.kbArticles.rate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["kbArticles", articleId] });
        hapticNotification("success");
      },
    }),
  );

  const handleRefresh = async () => {
    await article.refetch();
    hapticImpact("light");
  };

  const handleRate = (helpful: boolean) => {
    hapticImpact("medium");
    rateMutation.mutate({ id: articleId, helpful });
  };

  if (article.isLoading) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  if (!article.data) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted">Article not found</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container onRefresh={handleRefresh} refreshing={article.isFetching && !article.isLoading}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          {article.data.title}
        </Text>

        <View className="flex-row items-center gap-2 mb-4">
          <Ionicons name="folder-outline" size={14} color={mutedColor} />
          <Text className="text-muted text-xs">
            {article.data.category?.name || "Uncategorized"}
          </Text>
          <Text className="text-muted text-xs">•</Text>
          <Text className="text-muted text-xs">{article.data.views || 0} views</Text>
        </View>

        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <Text className="text-foreground leading-relaxed whitespace-pre-wrap">
            {article.data.content}
          </Text>
        </Surface>

        <View className="mb-4">
          <Text className="text-foreground font-medium mb-2">Was this article helpful?</Text>
          <View className="flex-row gap-2">
            <Button
              variant={article.data.userRating === true ? "primary" : "secondary"}
              onPress={() => handleRate(true)}
              isDisabled={rateMutation.isPending}
              className="flex-1"
            >
              <Ionicons
                name="thumbs-up-outline"
                size={18}
                color={article.data.userRating === true ? foregroundColor : mutedColor}
              />
              <Text className="ml-2">Yes</Text>
            </Button>
            <Button
              variant={article.data.userRating === false ? "primary" : "secondary"}
              onPress={() => handleRate(false)}
              isDisabled={rateMutation.isPending}
              className="flex-1"
            >
              <Ionicons
                name="thumbs-down-outline"
                size={18}
                color={article.data.userRating === false ? foregroundColor : mutedColor}
              />
              <Text className="ml-2">No</Text>
            </Button>
          </View>
        </View>

        <Surface variant="tertiary" className="p-4 rounded-lg">
          <View className="flex-row items-center gap-2">
            <Ionicons name="information-circle-outline" size={18} color={mutedColor} />
            <Text className="text-muted text-sm">
              Need more help? <Text className="text-primary">Contact support</Text>
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </Container>
  );
}
