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
import { useLocalSearchParams, Link } from "expo-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import { NotificationBanner } from "@/components/NotificationBanner";
import { LiveChatSheet } from "@/components/LiveChatSheet";
import { useSocketContext } from "@/providers/SocketProvider";
import type { NotificationPayload } from "@ticket-app/socket-client";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const _mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");
  const { socket, isConnected } = useSocketContext();

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [viewers, setViewers] = useState<any[]>([]);
  const [_notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (!socket || !isConnected || !ticketId) return;

    const handleViewerJoined = (data: any) => {
      if (data.ticketId === ticketId) {
        setViewers((prev) => {
          if (prev.some((v) => v.userId === data.userId)) return prev;
          return [...prev, data];
        });
      }
    };

    const handleViewerLeft = (data: { ticketId: number; userId: number }) => {
      if (data.ticketId === ticketId) {
        setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
      }
    };

    const handleViewersList = (data: { ticketId: number; viewers: any[] }) => {
      if (data.ticketId === ticketId) {
        setViewers(data.viewers);
      }
    };

    const handleNotification = (data: NotificationPayload) => {
      if (data.userId === undefined || !data.read) {
        setNotifications((prev) => [data, ...prev]);
        setCurrentNotification(data);
      }
    };

    socket.on("viewer_joined", handleViewerJoined);
    socket.on("viewer_left", handleViewerLeft);
    socket.on("viewers_list", handleViewersList);
    socket.on("notification", handleNotification);

    socket.emit("join_ticket", { ticketId, userName: "Agent", avatarUrl: undefined });
    socket.emit("get_viewers", { ticketId });

    heartbeatRef.current = setInterval(() => {
      socket.emit("heartbeat", { ticketId });
    }, 30000);

    return () => {
      socket.off("viewer_joined", handleViewerJoined);
      socket.off("viewer_left", handleViewerLeft);
      socket.off("viewers_list", handleViewersList);
      socket.off("notification", handleNotification);
      socket.emit("leave_ticket", { ticketId });
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [socket, isConnected, ticketId]);

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  const handleNotificationPress = useCallback(
    (notification: NotificationPayload) => {
      if (notification.ticketId) {
        hapticImpact("light");
        dismissNotification();
      }
    },
    [dismissNotification],
  );

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

  const _getPriorityColor = (priority: string) => {
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
      <NotificationBanner
        notification={currentNotification}
        onDismiss={dismissNotification}
        onPress={handleNotificationPress}
      />

      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <Surface variant="secondary" className="p-4 rounded-lg mb-4">
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-foreground font-semibold">{ticket.data.reference}</Text>
            <View className="flex-row items-center gap-2">
              <PresenceAvatars viewers={viewers} maxVisible={3} size="sm" />
              <Chip variant="flat" color={getStatusColor(ticket.data.status)} size="sm">
                <Chip.Label>{ticket.data.status}</Chip.Label>
              </Chip>
            </View>
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
          <View className="flex-row gap-2">
            <Link href={`/tickets/${id}/replies`} asChild>
              <Button variant="ghost" size="sm">
                <Text className="text-primary text-sm">View All</Text>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onPress={() => setIsChatOpen(true)}>
              <Ionicons name="chatbubble" size={16} color={foregroundColor} />
              <Text className="text-foreground text-sm ml-1">Live</Text>
            </Button>
          </View>
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

      <LiveChatSheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={[]}
        isTyping={{ agent: false, contact: false }}
        onSendMessage={(body) => console.log("Send message:", body)}
        onSendTyping={(isTyping) => console.log("Typing:", isTyping)}
        sessionId={ticketId}
      />
    </Container>
  );
}
