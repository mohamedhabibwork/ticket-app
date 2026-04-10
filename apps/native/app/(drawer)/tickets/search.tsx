import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Chip, Spinner, Surface, Text, TextField, Input, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { useState } from "react";
import { View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function TicketSearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const mutedColor = useThemeColor("muted");

  const searchResults = useQuery(orpc.tickets.search.queryOptions({ query: searchQuery }), {
    enabled: searchQuery.trim().length > 0,
  });

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      hapticImpact("light");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "primary";
      case "pending":
        return "warning";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Container>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">
          Search Tickets
        </Text>

        <TextField>
          <Input
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search by reference, subject, or description..."
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
            <Text className="text-muted text-xs mt-1">Try a different search term</Text>
          </Surface>
        )}

        {searchResults.data && searchResults.data.length > 0 && (
          <View className="gap-3">
            {searchResults.data.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} asChild>
                <Pressable onPress={() => hapticImpact("light")}>
                  <Surface variant="secondary" className="p-4 rounded-lg">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text className="text-foreground font-medium text-sm">
                          {ticket.reference}
                        </Text>
                        <Text className="text-foreground mt-1" numberOfLines={1}>
                          {ticket.subject}
                        </Text>
                      </View>
                      <Chip variant="flat" color={getStatusColor(ticket.status)} size="sm">
                        <Chip.Label className="text-xs">{ticket.status}</Chip.Label>
                      </Chip>
                    </View>
                    <Text className="text-muted text-xs">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ""}
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
            <Text className="text-foreground font-medium mt-3">Search for tickets</Text>
            <Text className="text-muted text-xs mt-1">Enter a search term above</Text>
          </Surface>
        )}
      </View>
    </Container>
  );
}
