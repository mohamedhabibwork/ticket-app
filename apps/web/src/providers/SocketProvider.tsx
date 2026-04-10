import { useEffect, useRef, useState, createContext, useContext, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  NotificationPayload,
  ViewerPresence,
} from "@ticket-app/socket-client";

const SOCKET_URL = "http://localhost:3001";
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

interface SocketContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  error: Error | null;
  viewers: ViewerPresence[];
  notifications: NotificationPayload[];
  joinTicket: (ticketId: number, userName: string, avatarUrl?: string) => void;
  leaveTicket: (ticketId: number) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  token: string;
  userId: number;
  organizationId: number;
}

export function SocketProvider({ children, token, userId, organizationId }: SocketProviderProps) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [viewers, setViewers] = useState<ViewerPresence[]>([]);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      query: {
        userId: String(userId),
        organizationId: String(organizationId),
      },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: BASE_RECONNECT_DELAY,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      setError(new Error(err.message));
      reconnectAttemptsRef.current += 1;
    });

    socket.on("viewer_joined", (data: ViewerPresence) => {
      setViewers((prev) => {
        if (prev.some((v) => v.userId === data.userId && v.ticketId === data.ticketId)) {
          return prev;
        }
        return [...prev, data];
      });
    });

    socket.on("viewer_left", (data: { ticketId: number; userId: number }) => {
      setViewers((prev) =>
        prev.filter((v) => !(v.userId === data.userId && v.ticketId === data.ticketId)),
      );
    });

    socket.on("viewers_list", (data: { ticketId: number; viewers: ViewerPresence[] }) => {
      setViewers((prev) => {
        const filtered = prev.filter((v) => v.ticketId !== data.ticketId);
        return [...filtered, ...data.viewers];
      });
    });

    socket.on("notification", (data: NotificationPayload) => {
      if (data.userId === userId || !data.userId) {
        setNotifications((prev) => [data, ...prev]);
      }
    });

    socket.on("mark_read_ack", (data: { notificationId: string; success: boolean }) => {
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === data.notificationId ? { ...n, read: true } : n)),
        );
      }
    });

    socket.on("mark_all_read_ack", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, userId, organizationId]);

  const joinTicket = (ticketId: number, userName: string, avatarUrl?: string) => {
    if (socketRef.current) {
      socketRef.current.emit("join_ticket", { ticketId, userName, avatarUrl });
    }
  };

  const leaveTicket = (ticketId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("leave_ticket", { ticketId });
    }
  };

  const markAsRead = (notificationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("mark_read", { notificationId });
    }
  };

  const markAllAsRead = () => {
    if (socketRef.current) {
      socketRef.current.emit("mark_all_read");
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        error,
        viewers,
        notifications,
        joinTicket,
        leaveTicket,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}

export function usePresence(ticketId: number | null) {
  const { socket, isConnected, viewers, joinTicket, leaveTicket } = useSocketContext();

  useEffect(() => {
    if (!socket || !isConnected || ticketId === null) return;

    joinTicket(ticketId, "User", undefined);

    const heartbeatInterval = setInterval(() => {
      if (socket) {
        socket.emit("heartbeat", { ticketId });
      }
    }, 25000);

    return () => {
      clearInterval(heartbeatInterval);
      leaveTicket(ticketId);
    };
  }, [socket, ticketId, isConnected, joinTicket, leaveTicket]);

  const ticketViewers = viewers.filter((v) => v.ticketId === ticketId);

  return {
    viewers: ticketViewers,
    isConnected,
  };
}

export function useNotifications() {
  const { notifications, markAsRead, markAllAsRead } = useSocketContext();
  return { notifications, markAsRead, markAllAsRead };
}
