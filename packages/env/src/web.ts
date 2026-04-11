import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().default("http://localhost:3000"),
    VITE_SERVER_URL: z.string().default("http://localhost:3000"),
  },
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
});
