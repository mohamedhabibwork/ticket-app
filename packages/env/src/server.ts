import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    REDIS_URL: z.string().min(1),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.number().default(587),
    SMTP_SECURE: z.boolean().default(false),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.string().min(1),
    QUEUE_PREFIX: z.string().default("ticket-app"),
    STORAGE_PROVIDER: z.enum(["s3", "minio", "local", "oracle"]).default("s3"),
    STORAGE_BUCKET: z.string().default("ticket-app-uploads"),
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().default("us-east-1"),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    STORAGE_PUBLIC_URL: z.string().optional(),
    STORAGE_LOCAL_PATH: z.string().default("./uploads"),
    STORAGE_MAX_FILE_SIZE: z.number().default(52428800),
    STORAGE_CDN_URL: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    PAYTABS_SERVER_KEY: z.string().min(1),
    PAYTABS_CLIENT_KEY: z.string().min(1),
    PAYTABS_PROFILE_ID: z.string().min(1),
    PAYTABS_BASE_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
