import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Chip, Divider, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { useLocalSearchParams, Link } from "expo-router";
import { View, ScrollView, Alert } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = parseInt(id, 10);
  const mutedColor = useThemeColor("muted");

  const contact = useQuery(orpc.contacts.get.queryOptions({ id: contactId }));
  const tickets = useQuery(orpc.tickets.listByContact.queryOptions({ contactId }));

  const handleRefresh = async () => {
    await Promise.all([contact.refetch(), tickets.refetch()]);
    hapticImpact("light");
  };

  const handleCall = () => {
    if (contact.data?.phone) {
      hapticImpact("medium");
      Alert.alert("Call Contact", `Would you like to call ${contact.data.phone}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => {} },
      ]);
    }
  };

  const handleEmail = () => {
    if (contact.data?.email) {
      hapticImpact("medium");
      Alert.alert("Email Contact", `Would you like to email ${contact.data.email}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Email", onPress: () => {} },
      ]);
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

  if (contact.isLoading) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  if (!contact.data) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted">Contact not found</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container onRefresh={handleRefresh} refreshing={contact.isFetching && !contact.isLoading}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-3">
              <Text className="text-white text-2xl font-medium">
                {contact.data.name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <Text className="text-xl font-semibold text-foreground">{contact.data.name}</Text>
          </View>

          <View className="flex-row justify-center gap-3 mb-4">
            {contact.data.phone && (
              <Button variant="secondary" size="sm" onPress={handleCall}>
                <Ionicons name="call-outline" size={18} color={mutedColor} />
                <Text className="ml-1 text-sm">Call</Text>
              </Button>
            )}
            <Button variant="secondary" size="sm" onPress={handleEmail}>
              <Ionicons name="mail-outline" size={18} color={mutedColor} />
              <Text className="ml-1 text-sm">Email</Text>
            </Button>
          </View>

          <Divider className="my-4" />

          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Ionicons name="mail-outline" size={18} color={mutedColor} />
              <View>
                <Text className="text-muted text-xs">Email</Text>
                <Text className="text-foreground text-sm">{contact.data.email}</Text>
              </View>
            </View>

            {contact.data.phone && (
              <View className="flex-row items-center gap-3">
                <Ionicons name="call-outline" size={18} color={mutedColor} />
                <View>
                  <Text className="text-muted text-xs">Phone</Text>
                  <Text className="text-foreground text-sm">{contact.data.phone}</Text>
                </View>
              </View>
            )}

            {contact.data.company && (
              <View className="flex-row items-center gap-3">
                <Ionicons name="business-outline" size={18} color={mutedColor} />
                <View>
                  <Text className="text-muted text-xs">Company</Text>
                  <Text className="text-foreground text-sm">{contact.data.company}</Text>
                </View>
              </View>
            )}
          </View>
        </Surface>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-foreground">Ticket History</Text>
          <Text className="text-muted text-sm">{tickets.data?.length || 0} tickets</Text>
        </View>

        {tickets.data && tickets.data.length > 0 ? (
          <View className="gap-2">
            {tickets.data.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} asChild>
                <Surface variant="secondary" className="p-3 rounded-lg">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-foreground font-medium text-sm">
                        {ticket.reference}
                      </Text>
                      <Text className="text-foreground text-sm" numberOfLines={1}>
                        {ticket.subject}
                      </Text>
                    </View>
                    <Chip variant="flat" color={getStatusColor(ticket.status)} size="sm">
                      <Chip.Label className="text-xs">{ticket.status}</Chip.Label>
                    </Chip>
                  </View>
                </Surface>
              </Link>
            ))}
          </View>
        ) : (
          <Surface variant="secondary" className="items-center justify-center py-8 rounded-lg">
            <Ionicons name="ticket-outline" size={32} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No tickets</Text>
            <Text className="text-muted text-xs mt-1">This contact has no tickets</Text>
          </Surface>
        )}
      </ScrollView>
    </Container>
  );
}
