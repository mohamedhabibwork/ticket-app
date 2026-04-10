import { publicProcedure } from "../index";
import {
  loginWithEmail,
  verify2FA,
  registerWithEmail,
  logout,
  validateSession,
  refreshSession,
  revokeAllUserSessions,
} from "../services/auth";
import { sessions } from "@ticket-app/db/lib/sessions";
import * as z from "zod";

export const authRouter = {
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const result = await loginWithEmail(
        input.email,
        input.password,
        input.ipAddress,
        input.userAgent,
      );
      return result;
    }),

  register: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const result = await registerWithEmail(
        input.organizationId,
        input.email,
        input.password,
        input.firstName,
        input.lastName,
        input.ipAddress,
        input.userAgent,
        input.locale,
        input.timezone,
      );
      return result;
    }),

  verify2FA: publicProcedure
    .input(
      z.object({
        tempToken: z.string(),
        code: z.string().length(6),
      }),
    )
    .handler(async ({ input }) => {
      const result = await verify2FA(input.tempToken, input.code);
      return result;
    }),

  logout: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      await logout(input.sessionToken);
      return { success: true };
    }),

  validate: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const session = await validateSession(input.sessionToken);
      return { valid: !!session, session };
    }),

  refresh: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const session = await refreshSession(input.sessionToken);
      if (!session) {
        return { success: false, session: null };
      }
      return { success: true, session };
    }),

  revokeAllSessions: publicProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await revokeAllUserSessions(input.userId);
      return { success: true };
    }),

  getSession: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const session = await sessions.get(input.sessionToken);
      return session;
    }),
};
