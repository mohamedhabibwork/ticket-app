import { useEffect, useState, useCallback } from "react";

interface Viewer {
  ticketId: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
}

interface PresenceIndicatorProps {
  ticketId: number;
  currentUserId: number;
  currentUserName: string;
}

export function PresenceIndicator({
  ticketId,
  currentUserId,
  currentUserName,
}: PresenceIndicatorProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [_ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/presence/${ticketId}/${currentUserId}/${encodeURIComponent(currentUserName)}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Presence WebSocket connected");
      socket.send(JSON.stringify({ type: "get_viewers" }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "viewers_list") {
        setViewers(data.viewers.filter((v: Viewer) => v.userId !== currentUserId));
      } else if (data.type === "viewer_joined") {
        if (data.userId !== currentUserId) {
          setViewers((prev) => {
            if (prev.find((v) => v.userId === data.userId)) return prev;
            return [...prev, data];
          });
        }
      } else if (data.type === "viewer_left") {
        setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
      }
    };

    socket.onclose = () => {
      console.log("Presence WebSocket disconnected, reconnecting...");
      setTimeout(connect, 3000);
    };

    setWs(socket);

    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 25000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.close();
    };
  }, [ticketId, currentUserId, currentUserName]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const otherViewers = viewers.filter((v) => v.userId !== currentUserId);

  if (otherViewers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-gray-500">Viewing:</span>
      <div className="flex -space-x-2">
        {otherViewers.slice(0, 3).map((viewer) => (
          <div
            key={viewer.userId}
            className="relative h-8 w-8 rounded-full border-2 border-white bg-gray-200"
            title={viewer.userName}
          >
            {viewer.avatarUrl ? (
              <img
                src={viewer.avatarUrl}
                alt={viewer.userName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {viewer.userName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
          </div>
        ))}
        {otherViewers.length > 3 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs">
            +{otherViewers.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}
