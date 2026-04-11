import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "@ticket-app/env/server";
import type { Server as SocketIOServer } from "socket.io";
import { createClient } from "redis";

let pubClient: ReturnType<typeof createClient>;
let subClient: ReturnType<typeof createClient>;

function createRedisClient(): ReturnType<typeof createClient> {
  const client = createClient({
    url: env.REDIS_URL,
  });

  client.on("error", (err: Error) => {
    console.error("Redis client error:", err);
  });

  return client;
}

export async function setupRedisAdapter(io: SocketIOServer): Promise<void> {
  pubClient = createRedisClient();
  subClient = createRedisClient();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  console.log("Socket.io Redis adapter initialized");
}

export function getRedisClients(): {
  pubClient: ReturnType<typeof createClient>;
  subClient: ReturnType<typeof createClient>;
} {
  return { pubClient, subClient };
}
