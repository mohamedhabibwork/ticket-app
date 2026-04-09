import { Redis } from "ioredis";
import { env } from "@ticket-app/env/server";

const redis = new Redis(env.REDIS_URL);

const PRESENCE_TTL = 30;

export interface ViewerPresence {
  ticketId: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export async function joinTicket(ticketId: number, userId: number, userName: string, avatarUrl?: string): Promise<void> {
  const key = `presence:ticket:${ticketId}`;
  const viewerKey = `presence:viewer:${ticketId}:${userId}`;
  
  const presence: ViewerPresence = {
    ticketId,
    userId,
    userName,
    avatarUrl,
    joinedAt: new Date().toISOString(),
  };
  
  await redis.setex(viewerKey, PRESENCE_TTL, JSON.stringify(presence));
  await redis.sadd(key, userId.toString());
}

export async function leaveTicket(ticketId: number, userId: number): Promise<void> {
  const key = `presence:ticket:${ticketId}`;
  const viewerKey = `presence:viewer:${ticketId}:${userId}`;
  
  await redis.del(viewerKey);
  await redis.srem(key, userId.toString());
}

export async function heartbeat(ticketId: number, userId: number): Promise<boolean> {
  const viewerKey = `presence:viewer:${ticketId}:${userId}`;
  const exists = await redis.exists(viewerKey);
  
  if (exists) {
    await redis.expire(viewerKey, PRESENCE_TTL);
    return true;
  }
  return false;
}

export async function getTicketViewers(ticketId: number): Promise<ViewerPresence[]> {
  const key = `presence:ticket:${ticketId}`;
  const userIds = await redis.smembers(key);
  
  if (userIds.length === 0) return [];
  
  const viewers: ViewerPresence[] = [];
  for (const userId of userIds) {
    const viewerKey = `presence:viewer:${ticketId}:${userId}`;
    const data = await redis.get(viewerKey);
    if (data) {
      viewers.push(JSON.parse(data));
    } else {
      await redis.srem(key, userId);
    }
  }
  
  return viewers;
}

export async function isViewingTicket(ticketId: number, userId: number): Promise<boolean> {
  const viewerKey = `presence:viewer:${ticketId}:${userId}`;
  return (await redis.exists(viewerKey)) === 1;
}

export { redis };
