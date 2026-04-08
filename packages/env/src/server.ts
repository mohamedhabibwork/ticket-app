import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    REDIS_URL: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.number().default(587),
    SMTP_SECURE: z.boolean().default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),
    QUEUE_PREFIX: z.string().default("ticket-app"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
