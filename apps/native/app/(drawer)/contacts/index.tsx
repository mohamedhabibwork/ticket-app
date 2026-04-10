import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, TextField, Input, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { useState } from "react";
import { View, Pressable, FlatList, Alert } from "react-native";

import { Container } from "@/components/container";
import { SwipeableRow } from "@/components/swipeable-row";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function ContactListScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const mutedColor = useThemeColor("muted");

  const contacts = useQuery(orpc.contacts.list.queryOptions());

  const handleRefresh = async () => {
    await contacts.refetch();
    hapticImpact("light");
  };

  const handleCallContact = (phone: string) => {
    hapticImpact("medium");
    Alert.alert("Call Contact", `Would you like to call ${phone}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Call", onPress: () => {} },
    ]);
  };

  const handleEmailContact = (email: string) => {
    hapticImpact("medium");
    Alert.alert("Email Contact", `Would you like to email ${email}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Email", onPress: () => {} },
    ]);
  };

  const filteredContacts = contacts.data?.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Container onRefresh={handleRefresh} refreshing={contacts.isFetching && !contacts.isLoading}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-4">Contacts</Text>

        <TextField>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts..."
            leftIcon={<Ionicons name="search" size={18} color={mutedColor} />}
          />
        </TextField>
      </View>

      {contacts.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading contacts...</Text>
        </View>
      )}

      {filteredContacts && filteredContacts.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="people-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No contacts found</Text>
            <Text className="text-muted text-xs mt-1">
              {searchQuery ? "Try a different search" : "Add your first contact"}
            </Text>
          </Surface>
        </View>
      )}

      {filteredContacts && filteredContacts.length > 0 && (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="px-4 pb-4"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <SwipeableRow
              key={item.id}
              rightActions={[
                ...(item.phone
                  ? [
                      {
                        icon: "call-outline",
                        color: "#34C759",
                        onPress: () => handleCallContact(item.phone!),
                      } as const,
                    ]
                  : []),
                {
                  icon: "mail-outline",
                  color: "#007AFF",
                  onPress: () => handleEmailContact(item.email),
                },
              ]}
              onLongPress={() => {
                hapticImpact("heavy");
                Alert.alert(item.name, `Contact options`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "View Details", onPress: () => {} },
                  ...(item.phone
                    ? [{ text: "Call", onPress: () => handleCallContact(item.phone!) }]
                    : []),
                  { text: "Email", onPress: () => handleEmailContact(item.email) },
                ]);
              }}
            >
              <Link href={`/contacts/${item.id}`} asChild>
                <Pressable>
                  <Surface variant="secondary" className="p-4 rounded-lg">
                    <View className="flex-row items-center gap-3">
                      <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                        <Text className="text-white font-medium">
                          {item.name?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium">{item.name}</Text>
                        <Text className="text-muted text-sm">{item.email}</Text>
                        {item.phone && <Text className="text-muted text-xs">{item.phone}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                    </View>
                  </Surface>
                </Pressable>
              </Link>
            </SwipeableRow>
          )}
        />
      )}
    </Container>
  );
}
