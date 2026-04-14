import { Server as SocketIOServer } from "socket.io";
import { validateToken, type AuthenticatedUser } from "./auth";
import { joinRoom, leaveAllRooms } from "./emit";
import { registerPresenceHandlers } from "./handlers/presence";
import { registerNotificationHandlers } from "./handlers/notifications";
import { registerChatHandlers } from "./handlers/chat";
import { setupRedisAdapter } from "./adapter";
import { socketLogger, logger } from "../lib/logger";

const ALLOWED_ORIGINS = process.env.CORS_ORIGIN || "http://localhost:5173";

let io: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function initializeSocketServer(httpServer?: any): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer({
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const user = await validateToken(token);

    if (!user) {
      return next(new Error("Invalid or expired token"));
    }

    socket.data.user = user;
    socket.data.rooms = new Set();

    next();
  });

  io.on("connection", (socket) => {
    const user: AuthenticatedUser = socket.data.user;

    socketLogger.connection(socket.id, user.userId, user.organizationId);

    joinRoom(user.userId, `user:${user.userId}`);
    joinRoom(user.organizationId, `org:${user.organizationId}`);

    registerPresenceHandlers(io!, socket);
    registerNotificationHandlers(io!, socket);
    registerChatHandlers(io!, socket);

    socket.on("disconnect", (reason) => {
      socketLogger.disconnection(socket.id, user.userId, reason);
      leaveAllRooms(user.userId);
    });

    socket.on("error", (err) => {
      socketLogger.error(socket.id, user.userId, err.message || String(err));
    });
  });

  if (httpServer) {
    io.attach(httpServer);
  }

  return io;
}

export async function initializeWithRedisAdapter(httpServer?: any): Promise<SocketIOServer> {
  const socketServer = initializeSocketServer(httpServer);

  try {
    await setupRedisAdapter(socketServer);
    logger.info("Socket server initialized with Redis adapter");
  } catch (error) {
    logger.error({ err: error }, "Failed to setup Redis adapter, falling back to in-memory");
  }

  return socketServer;
}

export { emitToUser, emitToTicket, emitToOrg, emitToChat } from "./emit";
