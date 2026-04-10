import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "@ticket-app/env/server";
import type { RedisClientType } from "@socket.io/redis-adapter";
import type { Server as SocketIOServer } from "socket.io";
import { createClient, type RedisClientType as RedisType } from "redis";

const REDIS_URL = env.REDIS_URL;

let pubClient: RedisType;
let subClient: RedisType;

function createRedisClient(): RedisType {
  const url = new URL(REDIS_URL);
  const isSSL = url.protocol === "rediss:";

  const client = createClient({
    url: REDIS_URL,
    socket: {
      tls: isSSL,
      rejectUnauthorized: !isSSL,
    },
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

  io.adapter(
    createAdapter(pubClient as unknown as RedisClientType, subClient as unknown as RedisClientType),
  );

  console.log("Socket.io Redis adapter initialized");
}

export function getRedisClients(): { pubClient: RedisType; subClient: RedisType } {
  return { pubClient, subClient };
}
