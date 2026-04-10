import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@ticket-app/api/context";
import { appRouter } from "@ticket-app/api/routers/index";
import { env } from "@ticket-app/env/server";
import { streamText, convertToModelMessages, wrapLanguageModel } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth as authRoutes } from "./routes/auth";
import { billing as billingRoutes } from "./routes/billing";
import { widget as chatWidgetRoutes } from "./routes/chat/widget";
import { createExcelExportWorker, createExcelImportWorker } from "@ticket-app/queue";
import { initializeWithRedisAdapter, getSocketServer } from "./socket/index";
import { initializeSocketPubSub } from "./socket/pubsub";
import { requestLogger, logger } from "./lib/logger";

const app = new Hono();

logger.info("Starting Excel export worker...");
createExcelExportWorker();

logger.info("Starting Excel import worker...");
createExcelImportWorker();

app.use(requestLogger);
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      logger.error({ error }, "API handler error");
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      logger.error({ error }, "RPC handler error");
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.route("/auth", authRoutes);
app.route("/billing", billingRoutes);
app.route("/chat", chatWidgetRoutes);

app.post("/ai", async (c) => {
  const body = await c.req.json();
  const uiMessages = body.messages || [];
  const model = wrapLanguageModel({
    model: google("gemini-2.5-flash"),
    middleware: devToolsMiddleware(),
  });
  const result = streamText({
    model,
    messages: await convertToModelMessages(uiMessages),
  });

  return result.toUIMessageStreamResponse();
});

app.get("/", (c) => {
  return c.text("OK");
});

const PORT = parseInt(process.env.PORT || "3000");

const { server } = serve({
  fetch: app.fetch,
  port: PORT,
  override: true,
});

logger.info({ port: PORT }, "Server starting");

initializeWithRedisAdapter(server)
  .then(() => {
    logger.info("Socket.IO server initialized");

    initializeSocketPubSub()
      .then(() => {
        logger.info("Socket pub/sub subscriber initialized");
      })
      .catch((err) => {
        logger.error({ err }, "Failed to initialize socket pub/sub");
      });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to initialize Socket.IO server");
  });

export { getSocketServer };
export default app;
