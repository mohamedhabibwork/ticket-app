import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { env } from "@ticket-app/env/server";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
