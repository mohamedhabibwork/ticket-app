import crypto from "crypto";
import { env } from "@ticket-app/env/server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = env.ENCRYPTION_SECRET || env.DATABASE_URL || "default-secret-change-me";
  const salt = crypto.createHash("sha256").update("ticket-app-encryption-key-v1").digest();
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, "sha512");
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0] as string, "hex");
  const authTag = Buffer.from(parts[1] as string, "hex");
  const encrypted = parts[2] as string;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8").toString();
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function generateStateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyStateToken(
  token: string,
  stored: string,
  maxAgeMs: number = 600000,
): boolean {
  if (token !== stored) return false;

  const decoded = Buffer.from(token, "hex");
  const timestamp = decoded.readUInt32BE(0);
  const tokenTime = new Date(timestamp);
  const now = new Date();

  return now.getTime() - tokenTime.getTime() < maxAgeMs;
}
