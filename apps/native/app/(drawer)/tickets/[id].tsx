import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useLocalSearchParams, Stack, Link } from "expo-router";
import { useState } from "react";
import { View, ScrollView, Alert } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const ticket = useQuery(orpc.tickets.get.queryOptions({ id: ticketId }));
  const messages = useQuery(orpc.ticketMessages.list.queryOptions({ ticketId }));
  const updateMutation = useMutation(
    orpc.tickets.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
        hapticNotification("success");
      },
    }),
  );
  const replyMutation = useMutation(
    orpc.ticketMessages.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
        setReplyText("");
        hapticNotification("success");
      },
      onError: () => {
        hapticNotification("error");
      },
    }),
  );
  const noteMutation = useMutation(
    orpc.tickets.addNote.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
        setNoteText("");
        hapticNotification("success");
      },
      onError: () => {
        hapticNotification("error");
      },
    }),
  );

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");

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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "primary";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const handleStatusChange = (status: string) => {
    hapticImpact("medium");
    setSelectedStatus(status);
    updateMutation.mutate({ id: ticketId, status });
  };

  const handlePriorityChange = (priority: string) => {
    hapticImpact("medium");
    setSelectedPriority(priority);
    updateMutation.mutate({ id: ticketId, priority });
  };

  const handleReply = () => {
    if (replyText.trim()) {
      hapticImpact("light");
      replyMutation.mutate({ ticketId, body: replyText, isPublic: true });
    }
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      hapticImpact("light");
      noteMutation.mutate({ id: ticketId, note: noteText });
    }
  };

  if (ticket.isLoading) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  if (!ticket.data) {
    return (
      <Container>
        <View className="flex-1 justify-center items-center">
          <Text className="text-muted">Ticket not found</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-foreground font-semibold">{ticket.data.reference}</Text>
            <Chip variant="flat" color={getStatusColor(ticket.data.status)} size="sm">
              <Chip.Label>{ticket.data.status}</Chip.Label>
            </Chip>
          </View>
          <Text className="text-xl font-medium text-foreground mt-2">{ticket.data.subject}</Text>
          <Divider className="my-3" />
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-muted text-xs mb-1">Status</Text>
              <Select
                selectedKeys={selectedStatus || ticket.data.status}
                onSelectionChange={(keys) => handleStatusChange(Array.from(keys)[0] as string)}
                size="sm"
              >
                <SelectItem key="open">Open</SelectItem>
                <SelectItem key="pending">Pending</SelectItem>
                <SelectItem key="resolved">Resolved</SelectItem>
                <SelectItem key="closed">Closed</SelectItem>
              </Select>
            </View>
            <View className="flex-1">
              <Text className="text-muted text-xs mb-1">Priority</Text>
              <Select
                selectedKeys={selectedPriority || ticket.data.priority}
                onSelectionChange={(keys) => handlePriorityChange(Array.from(keys)[0] as string)}
                size="sm"
              >
                <SelectItem key="low">Low</SelectItem>
                <SelectItem key="medium">Medium</SelectItem>
                <SelectItem key="high">High</SelectItem>
                <SelectItem key="urgent">Urgent</SelectItem>
              </Select>
            </View>
          </View>
        </Surface>

        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-foreground">Messages</Text>
          <Link href={`/tickets/${id}/replies`} asChild>
            <Button variant="ghost" size="sm">
              <Text className="text-primary text-sm">View All</Text>
            </Button>
          </Link>
        </View>

        <View className="gap-3 mb-4">
          {messages.data?.map((message) => (
            <Surface
              key={message.id}
              variant={message.isPublic ? "secondary" : "tertiary"}
              className="p-3 rounded-lg"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-foreground font-medium text-sm">
                  {message.isPublic ? "Customer" : "Agent"}
                </Text>
                <Text className="text-muted text-xs">
                  {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}
                </Text>
              </View>
              <Text className="text-foreground text-sm">{message.body}</Text>
            </Surface>
          ))}
        </View>

        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <Text className="text-foreground font-medium mb-2">Reply</Text>
          <TextField className="mb-2">
            <Input
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type your reply..."
              multiline
              numberOfLines={3}
            />
          </TextField>
          <Button
            variant="primary"
            onPress={handleReply}
            isDisabled={!replyText.trim() || replyMutation.isPending}
          >
            {replyMutation.isPending ? <Spinner size="sm" /> : "Send Reply"}
          </Button>
        </Surface>

        <Surface variant="tertiary" className="p-4 rounded-lg">
          <Text className="text-foreground font-medium mb-2">Internal Note</Text>
          <TextField className="mb-2">
            <Input
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add a private note..."
              multiline
              numberOfLines={3}
            />
          </TextField>
          <Button
            variant="secondary"
            onPress={handleAddNote}
            isDisabled={!noteText.trim() || noteMutation.isPending}
          >
            {noteMutation.isPending ? <Spinner size="sm" /> : "Add Note"}
          </Button>
        </Surface>
      </ScrollView>
    </Container>
  );
}
