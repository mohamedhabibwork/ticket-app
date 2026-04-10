import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, TextField, Input, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { useState } from "react";
import { View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function KBSearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const mutedColor = useThemeColor("muted");

  const searchResults = useQuery(orpc.kbArticles.search.queryOptions({ query: searchQuery }), {
    enabled: searchQuery.trim().length > 0,
  });

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      hapticImpact("light");
    }
  };

  return (
    <Container>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">
          Search Articles
        </Text>

        <TextField>
          <Input
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search for help articles..."
            leftIcon={<Ionicons name="search" size={18} color={mutedColor} />}
          />
        </TextField>
      </View>

      <View className="px-4 pb-4">
        {searchResults.isLoading && (
          <View className="items-center justify-center py-8">
            <Spinner size="lg" />
            <Text className="text-muted text-sm mt-3">Searching...</Text>
          </View>
        )}

        {!searchResults.isLoading && searchQuery && searchResults.data?.length === 0 && (
          <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
            <Ionicons name="search-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No results found</Text>
            <Text className="text-muted text-xs mt-1">Try different keywords</Text>
          </Surface>
        )}

        {searchResults.data && searchResults.data.length > 0 && (
          <View className="gap-3">
            {searchResults.data.map((article) => (
              <Link key={article.id} href={`/kb/article/${article.id}`} asChild>
                <Pressable onPress={() => hapticImpact("light")}>
                  <Surface variant="secondary" className="p-4 rounded-lg">
                    <View className="flex-row items-center gap-3 mb-2">
                      <Ionicons name="document-text-outline" size={18} color={mutedColor} />
                      <Text className="text-foreground font-medium flex-1">{article.title}</Text>
                    </View>
                    <Text className="text-muted text-sm" numberOfLines={2}>
                      {article.excerpt || article.content?.substring(0, 100)}
                    </Text>
                  </Surface>
                </Pressable>
              </Link>
            ))}
          </View>
        )}

        {!searchQuery && (
          <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
            <Ionicons name="search" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">Search for help</Text>
            <Text className="text-muted text-xs mt-1">Find articles and guides</Text>
          </Surface>
        )}
      </View>
    </Container>
  );
}
