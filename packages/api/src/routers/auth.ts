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
import {
  createOtp,
  verifyOtp,
  validateOtpTempToken,
  sendOtpViaEmail,
  sendOtpViaWhatsApp,
  invalidateOtpTempToken,
  type OtpType,
} from "../services/otp";
import { sessions } from "@ticket-app/db/lib/sessions";
import { db } from "@ticket-app/db";
import { users, passwordResets } from "@ticket-app/db/schema";
import { hashPassword } from "../lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import * as z from "zod";

export const authRouter = {
  login: publicProcedure
    .input(
      z.object({
        email: z.email(),
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
        email: z.email(),
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

  sendOtp: publicProcedure
    .input(
      z.object({
        email: z.email().optional(),
        phone: z.string().optional(),
        method: z.enum(["email", "whatsapp"]),
        type: z.enum(["login", "password_reset", "email_verification", "2fa_email"]),
        organizationId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      if (!input.email && !input.phone) {
        throw new Error("Email or phone is required");
      }

      if (input.type === "password_reset") {
        const user = await db.query.users.findFirst({
          where: and(eq(users.email, (input.email || "").toLowerCase()), isNull(users.deletedAt)),
        });

        if (!user) {
          return { success: true, message: "If an account exists, an OTP has been sent" };
        }
      }

      if (input.type === "login" && input.organizationId) {
        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, (input.email || "").toLowerCase()),
            eq(users.organizationId, input.organizationId),
            isNull(users.deletedAt),
          ),
        });

        if (!user) {
          return { success: true, message: "If an account exists, an OTP has been sent" };
        }
      }

      const { code, expiresAt } = await createOtp(input.email, input.phone, input.type as OtpType);

      let sendResult: { success: boolean; error?: string };

      if (input.method === "email" && input.email) {
        sendResult = await sendOtpViaEmail(input.email, code, input.type as OtpType);
      } else if (input.method === "whatsapp" && input.phone) {
        sendResult = await sendOtpViaWhatsApp(input.phone, code, input.type as OtpType);
      } else {
        throw new Error("Invalid method or missing contact information");
      }

      if (!sendResult.success) {
        throw new Error(sendResult.error || "Failed to send OTP");
      }

      return { success: true, expiresAt: expiresAt.toISOString() };
    }),

  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.email().optional(),
        phone: z.string().optional(),
        code: z.string().length(6),
        type: z.enum(["login", "password_reset", "email_verification", "2fa_email"]),
      }),
    )
    .handler(async ({ input }) => {
      if (!input.email && !input.phone) {
        throw new Error("Email or phone is required");
      }

      const result = await verifyOtp(input.email, input.phone, input.code, input.type as OtpType);

      if (!result.valid) {
        throw new Error(result.error || "Invalid OTP");
      }

      return { success: true, tempToken: result.tempToken };
    }),

  resetPasswordWithOtp: publicProcedure
    .input(
      z.object({
        email: z.email(),
        tempToken: z.string(),
        newPassword: z.string().min(8),
      }),
    )
    .handler(async ({ input }) => {
      const tokenValidation = await validateOtpTempToken(input.tempToken, "password_reset");

      if (!tokenValidation.valid) {
        throw new Error(tokenValidation.error || "Invalid or expired token");
      }

      if (tokenValidation.email?.toLowerCase() !== input.email.toLowerCase()) {
        throw new Error("Email mismatch. Please start the password reset process again.");
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)),
      });

      if (!user) {
        throw new Error("User not found");
      }

      const passwordHash = await hashPassword(input.newPassword);

      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await db
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)));

      await invalidateOtpTempToken(input.tempToken);

      return { success: true };
    }),

  completeLoginWithOtp: publicProcedure
    .input(
      z.object({
        email: z.email(),
        tempToken: z.string(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const tokenValidation = await validateOtpTempToken(input.tempToken, "login");

      if (!tokenValidation.valid) {
        throw new Error(tokenValidation.error || "Invalid or expired session");
      }

      if (tokenValidation.email?.toLowerCase() !== input.email.toLowerCase()) {
        throw new Error("Email mismatch. Please start the login process again.");
      }

      const user = await db.query.users.findFirst({
        where: and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)),
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      const SESSION_TTL_SECONDS = 24 * 60 * 60;

      const sessionToken = crypto.randomUUID();
      const sessionData = {
        userId: user.id.toString(),
        organizationId: user.organizationId.toString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      };

      await sessions.set(sessionToken, sessionData, SESSION_TTL_SECONDS);

      await invalidateOtpTempToken(input.tempToken);

      return {
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          organizationId: user.organizationId,
          locale: user.locale,
          timezone: user.timezone,
          isPlatformAdmin: user.isPlatformAdmin,
          roles: user.roles.map((ur) => ({
            id: ur.role.id,
            name: ur.role.name,
            slug: ur.role.slug,
          })),
        },
        sessionToken,
      };
    }),
};
