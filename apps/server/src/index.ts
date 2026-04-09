import "dotenv/config";
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
import { logger } from "hono/logger";
import { websocket } from "@hono/node-ws";
import { joinTicket, leaveTicket, heartbeat, getTicketViewers } from "@ticket-app/api/lib/presence";

const app = new Hono();
const { upgradeWebSocket, websocket } = websocket({
  open(ws) {
    console.log("WebSocket opened");
  },
  close(ws) {
    console.log("WebSocket closed");
  },
});

app.use(logger());
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
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
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

app.get(
  "/ws/presence/:ticketId/:userId/:userName",
  upgradeWebSocket((c) => {
    const ticketId = parseInt(c.req.param("ticketId"));
    const userId = parseInt(c.req.param("userId"));
    const userName = c.req.param("userName");

    return {
      onOpen(ws) {
        joinTicket(ticketId, userId, userName).then(() => {
          ws.send(JSON.stringify({ type: "viewer_joined", ticketId, userId, userName }));
        });
      },
      onMessage(event, ws) {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") {
          heartbeat(ticketId, userId);
          ws.send(JSON.stringify({ type: "heartbeat_ack" }));
        } else if (data.type === "get_viewers") {
          getTicketViewers(ticketId).then((viewers) => {
            ws.send(JSON.stringify({ type: "viewers_list", viewers }));
          });
        }
      },
      onClose(ws) {
        leaveTicket(ticketId, userId);
      },
    };
  })
);

export { websocket };
export default app;
