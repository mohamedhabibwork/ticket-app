import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getExpoSecureStore } from "@/utils/secure-store";
import { useSocket } from "@ticket-app/socket-client";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  NotificationPayload,
  ServerToClientEvents,
  ViewerPresence,
} from "@ticket-app/socket-client";

interface SocketContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  error: Error | null;
  disconnect: () => void;
  reconnect: () => void;
}

interface PresenceContextValue {
  viewers: ViewerPresence[];
  joinTicket: (ticketId: number, userName: string, avatarUrl?: string) => void;
  leaveTicket: (ticketId: number) => void;
  sendHeartbeat: (ticketId: number) => void;
  requestViewers: (ticketId: number) => void;
}

interface NotificationsContextValue {
  notifications: NotificationPayload[];
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

interface SocketProviderProps {
  children: ReactNode;
  url?: string;
}

const SocketContext = createContext<SocketContextValue | null>(null);
const PresenceContext = createContext<PresenceContextValue | null>(null);
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function SocketProvider({ children, url = "http://localhost:3001" }: SocketProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const secureStore = getExpoSecureStore();
        const storedToken = await secureStore.getItemAsync("auth_token");
        const storedUserId = await secureStore.getItemAsync("user_id");
        const storedOrgId = await secureStore.getItemAsync("organization_id");

        if (storedToken) setToken(storedToken);
        if (storedUserId) setUserId(parseInt(storedUserId, 10));
        if (storedOrgId) setOrganizationId(parseInt(storedOrgId, 10));
      } catch (error) {
        console.error("Failed to load auth from secure store:", error);
      }
    };

    loadAuth();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        setIsActive(true);
      } else if (nextAppState.match(/inactive|background/)) {
        setIsActive(false);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const { socket, isConnected, error, disconnect } = useSocket({
    url,
    token: token ?? undefined,
    userId: userId ?? undefined,
    organizationId: organizationId ?? undefined,
  });

  useEffect(() => {
    if (!isActive && isConnected) {
      disconnect();
    }
  }, [isActive, isConnected, disconnect]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  const socketValue = useMemo(
    () => ({
      socket,
      isConnected: isActive && isConnected,
      error,
      disconnect,
      reconnect,
    }),
    [socket, isActive, isConnected, error, disconnect, reconnect],
  );

  return <SocketContext.Provider value={socketValue}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}

export function useSocketProvider() {
  return useSocketContext;
}

interface UsePresenceProviderOptions {
  enabled?: boolean;
}

export function PresenceProvider({
  children,
  ticketId = null,
  options = {},
}: {
  children: ReactNode;
  ticketId?: number | null;
  options?: UsePresenceProviderOptions;
}) {
  const { socket } = useSocketContext();
  const { enabled = true } = options;
  const [viewers, setViewers] = useState<ViewerPresence[]>([]);

  useEffect(() => {
    if (!socket || !enabled || ticketId === null) return;

    const handleViewerJoined = (data: ViewerPresence) => {
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

  const presenceValue = useMemo(
    () => ({
      viewers,
      joinTicket,
      leaveTicket,
      sendHeartbeat,
      requestViewers,
    }),
    [viewers, joinTicket, leaveTicket, sendHeartbeat, requestViewers],
  );

  return <PresenceContext.Provider value={presenceValue}>{children}</PresenceContext.Provider>;
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresenceContext must be used within a PresenceProvider");
  }
  return context;
}

export function NotificationsProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: number;
}) {
  const { socket } = useSocketContext();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    if (!socket || !userId) return;

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

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const notificationsValue = useMemo(
    () => ({
      notifications,
      markAsRead,
      markAllAsRead,
      unreadCount,
    }),
    [notifications, markAsRead, markAllAsRead, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={notificationsValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}
