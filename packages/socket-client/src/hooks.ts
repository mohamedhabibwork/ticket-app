import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  ClientToServerEvents,
  NotificationPayload,
  ServerToClientEvents,
  SocketInitOptions,
  ViewerPresence,
} from "./types";

interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  error: Error | null;
  disconnect: () => void;
}

export function useSocket(options: SocketInitOptions): UseSocketReturn {
  const { url = "http://localhost:3001", token, userId, organizationId } = options;
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      query: { userId: String(userId), organizationId: String(organizationId) },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      setError(new Error(err.message));
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, token, userId, organizationId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    error,
    disconnect,
  };
}

interface UsePresenceOptions {
  enabled?: boolean;
}

interface UsePresenceReturn {
  viewers: ViewerPresence[];
  joinTicket: (ticketId: number, userName: string, avatarUrl?: string) => void;
  leaveTicket: (ticketId: number) => void;
  sendHeartbeat: (ticketId: number) => void;
  requestViewers: (ticketId: number) => void;
}

export function usePresence(
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null,
  ticketId: number | null,
  options: UsePresenceOptions = {},
): UsePresenceReturn {
  const { enabled = true } = options;
  const [viewers, setViewers] = useState<ViewerPresence[]>([]);

  useEffect(() => {
    if (!socket || !enabled || ticketId === null) return;

    const handleViewerJoined = (data: ViewerPresence) => {
      if (data.ticketId === ticketId) {
        setViewers((prev) => {
          const exists = prev.some((v) => v.userId === data.userId);
          if (exists) return prev;
          return [...prev, data];
        });
      }
    };

    const handleViewerLeft = (data: { ticketId: number; userId: number }) => {
      if (data.ticketId === ticketId) {
        setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
      }
    };

    const handleViewersList = (data: { ticketId: number; viewers: ViewerPresence[] }) => {
      if (data.ticketId === ticketId) {
        setViewers(data.viewers);
      }
    };

    socket.on("viewer_joined", handleViewerJoined);
    socket.on("viewer_left", handleViewerLeft);
    socket.on("viewers_list", handleViewersList);

    return () => {
      socket.off("viewer_joined", handleViewerJoined);
      socket.off("viewer_left", handleViewerLeft);
      socket.off("viewers_list", handleViewersList);
    };
  }, [socket, ticketId, enabled]);

  const joinTicket = useCallback(
    (id: number, userName: string, avatarUrl?: string) => {
      if (socket) {
        socket.emit("join_ticket", { ticketId: id, userName, avatarUrl });
      }
    },
    [socket],
  );

  const leaveTicket = useCallback(
    (id: number) => {
      if (socket) {
        socket.emit("leave_ticket", { ticketId: id });
      }
    },
    [socket],
  );

  const sendHeartbeat = useCallback(
    (id: number) => {
      if (socket) {
        socket.emit("heartbeat", { ticketId: id });
      }
    },
    [socket],
  );

  const requestViewers = useCallback(
    (id: number) => {
      if (socket) {
        socket.emit("get_viewers", { ticketId: id });
      }
    },
    [socket],
  );

  return { viewers, joinTicket, leaveTicket, sendHeartbeat, requestViewers };
}

interface UseNotificationsReturn {
  notifications: NotificationPayload[];
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

export function useNotifications(
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null,
  userId: number,
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: NotificationPayload) => {
      if (data.userId === userId || !data.userId) {
        setNotifications((prev) => [data, ...prev]);
      }
    };

    const handleMarkReadAck = (data: { notificationId: string; success: boolean }) => {
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === data.notificationId ? { ...n, read: true } : n)),
        );
      }
    };

    const handleMarkAllReadAck = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    socket.on("notification", handleNotification);
    socket.on("mark_read_ack", handleMarkReadAck);
    socket.on("mark_all_read_ack", handleMarkAllReadAck);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("mark_read_ack", handleMarkReadAck);
      socket.off("mark_all_read_ack", handleMarkAllReadAck);
    };
  }, [socket, userId]);

  const markAsRead = useCallback(
    (notificationId: string) => {
      if (socket) {
        socket.emit("mark_read", { notificationId });
      }
    },
    [socket],
  );

  const markAllAsRead = useCallback(() => {
    if (socket) {
      socket.emit("mark_all_read");
    }
  }, [socket]);

  return { notifications, markAsRead, markAllAsRead };
}

interface UseChatSessionReturn {
  messages: ChatMessage[];
  isTyping: { agent: boolean; contact: boolean };
  joinSession: (sessionId: number, isAgent: boolean) => void;
  leaveSession: (sessionId: number) => void;
  sendMessage: (sessionId: number, body: string, attachments?: unknown[]) => void;
  sendTyping: (sessionId: number, isTyping: boolean) => void;
}

export function useChatSession(
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null,
  sessionId: number | null,
): UseChatSessionReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingState, setTypingState] = useState({ agent: false, contact: false });

  useEffect(() => {
    if (!socket || sessionId === null) return;

    const handleMessage = (data: ChatMessage) => {
      if (data.sessionId === sessionId) {
        setMessages((prev) => {
          if (data.id && prev.some((m) => m.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
      }
    };

    const handleTyping = (data: {
      sessionId: number;
      agentTyping: boolean;
      contactTyping: boolean;
    }) => {
      if (data.sessionId === sessionId) {
        setTypingState({ agent: data.agentTyping, contact: data.contactTyping });
      }
    };

    socket.on("message", handleMessage);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("message", handleMessage);
      socket.off("typing", handleTyping);
    };
  }, [socket, sessionId]);

  const joinSession = useCallback(
    (id: number, isAgent: boolean) => {
      if (socket) {
        socket.emit("join_session", { sessionId: id, isAgent });
      }
    },
    [socket],
  );

  const leaveSession = useCallback(
    (id: number) => {
      if (socket) {
        socket.emit("leave_session", { sessionId: id });
      }
    },
    [socket],
  );

  const sendMessage = useCallback(
    (id: number, body: string, attachments?: unknown[]) => {
      if (socket) {
        socket.emit("send_message", { sessionId: id, body, attachments });
      }
    },
    [socket],
  );

  const sendTyping = useCallback(
    (id: number, isTyping: boolean) => {
      if (socket) {
        socket.emit("typing", { sessionId: id, isTyping });
      }
    },
    [socket],
  );

  return {
    messages,
    isTyping: typingState,
    joinSession,
    leaveSession,
    sendMessage,
    sendTyping,
  };
}
