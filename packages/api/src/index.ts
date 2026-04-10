import { os } from "@orpc/server";
import { ORPCError } from "@orpc/server";

import type { Context, SessionData } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

export const protectedProcedure = o.use(async ({ context, next }) => {
  if (!(context.auth as SessionData).userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
    });
  }

  return next({ context: { ...context, auth: context.auth } });
});
