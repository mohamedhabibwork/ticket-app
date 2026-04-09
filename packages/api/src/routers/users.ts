import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { db } from "@ticket-app/db";
import {
  users,
  userRoles,
  roles,
  userSessions,
  twoFactorAuth,
  subscriptions,
  seats,
  apiKeys,
} from "@ticket-app/db/schema";
import { hashPassword, verifyPassword } from "../lib/auth";
import { publicProcedure } from "../index";
import z from "zod";
import { authenticator } from "otplib";
import {
  getUserPermissions,
  hasPermission,
  getRoleWithPermissions,
  createRole,
  updateRolePermissions,
  deleteRole,
  seedDefaultPermissions,
  seedSystemRoles,
  assignUserToTeam,
  removeUserFromTeam,
  createGroup,
  updateGroup,
  deleteGroup,
  listGroups,
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listPermissions,
  getUsersByPermission,
} from "../services/rbac";
import { createAuditLog, trackChanges } from "@ticket-app/server/middleware/audit";

export const usersRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        roleId: z.number().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(users.organizationId, input.organizationId), isNull(users.deletedAt)];

      if (input.isActive !== undefined) {
        conditions.push(eq(users.isActive, input.isActive));
      }

      if (input.search) {
        conditions.push(
          sql`(${users.email} ILIKE ${`%${input.search}%`} OR ${users.firstName} ILIKE ${`%${input.search}%`} OR ${users.lastName} ILIKE ${`%${input.search}%`})`,
        );
      }

      let userList = await db.query.users.findMany({
        where: and(...conditions),
        orderBy: [desc(users.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      });

      if (input.roleId) {
        userList = userList.filter((user) => user.roles.some((ur) => ur.roleId === input.roleId));
      }

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...conditions));

      return {
        users: userList,
        total: Number(countResult[0]?.count || 0),
      };
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.id),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      });

      return user;
    }),

  getByEmail: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.users.findFirst({
        where: and(
          eq(users.email, input.email.toLowerCase()),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        password: z.string().min(8).optional(),
        phone: z.string().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
        roleIds: z.array(z.number()).optional(),
        isActive: z.boolean().default(true),
        sendWelcomeEmail: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, input.organizationId),
        with: {
          plan: true,
          seats: true,
        },
      });

      if (subscription?.plan) {
        const activeSeats = subscription.seats?.filter((s) => !s.removedAt) || [];
        const maxAgents = subscription.plan.maxAgents || 0;

        if (maxAgents > 0 && activeSeats.length >= maxAgents) {
          throw new Error("Seat limit reached. Please upgrade your plan.");
        }
      }

      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.email, input.email.toLowerCase()),
          eq(users.organizationId, input.organizationId),
        ),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const passwordHash = input.password ? await hashPassword(input.password) : null;

      const [newUser] = await db
        .insert(users)
        .values({
          organizationId: input.organizationId,
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          locale: input.locale,
          timezone: input.timezone,
          isActive: input.isActive,
        })
        .returning();

      if (input.roleIds && input.roleIds.length > 0) {
        await db.insert(userRoles).values(
          input.roleIds.map((roleId) => ({
            userId: newUser.id,
            roleId,
          })),
        );
      }

      if (subscription) {
        await db.insert(seats).values({
          subscriptionId: subscription.id,
          userId: newUser.id,
          role: "agent",
          addedAt: new Date(),
        });
      }

      return newUser;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        email: z.string().email().optional(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
        isActive: z.boolean().optional(),
        availabilityStatus: z.enum(["online", "away", "busy", "offline"]).optional(),
        roleIds: z.array(z.number()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.id),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
      });

      if (!user) {
        throw new Error("User not found");
      }

      const [updated] = await db
        .update(users)
        .set({
          email: input.email?.toLowerCase(),
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          locale: input.locale,
          timezone: input.timezone,
          isActive: input.isActive,
          availabilityStatus: input.availabilityStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();

      if (input.roleIds !== undefined) {
        await db.delete(userRoles).where(eq(userRoles.userId, input.id));

        if (input.roleIds.length > 0) {
          await db.insert(userRoles).values(
            input.roleIds.map((roleId) => ({
              userId: input.id,
              roleId,
            })),
          );
        }
      }

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.id),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
      });

      if (!user) {
        throw new Error("User not found");
      }

      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id));

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, input.id), sql`${userSessions.revokedAt} IS NULL`));

      return { success: true };
    }),

  updateProfile: publicProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
        bio: z.string().optional(),
        signatureHtml: z.string().optional(),
        avatarUrl: z.string().url().optional(),
        displayName: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          locale: input.locale,
          timezone: input.timezone,
          bio: input.bio,
          signatureHtml: input.signatureHtml,
          avatarUrl: input.avatarUrl,
          displayName: input.displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();

      return updated;
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        id: z.number(),
        oldPassword: z.string(),
        newPassword: z.string().min(8),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.passwordHash) {
        const isValid = await verifyPassword(input.oldPassword, user.passwordHash);
        if (!isValid) {
          throw new Error("Current password is incorrect");
        }
      }

      const passwordHash = await hashPassword(input.newPassword);

      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id));

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSessions.userId, input.id), sql`${userSessions.revokedAt} IS NULL`));

      return { success: true };
    }),

  setup2FA: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        method: z.enum(["totp"]),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(user.email, "TicketApp", secret);

      await db
        .insert(twoFactorAuth)
        .values({
          userId: input.userId,
          method: input.method,
          totpSecret: secret,
          isEnabled: false,
        })
        .onConflictDoUpdate({
          target: twoFactorAuth.userId,
          set: {
            method: input.method,
            totpSecret: secret,
            isEnabled: false,
            updatedAt: new Date(),
          },
        });

      return {
        secret,
        otpauthUrl,
      };
    }),

  verify2FA: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        code: z.string().length(6),
      }),
    )
    .handler(async ({ input }) => {
      const tfa = await db.query.twoFactorAuth.findFirst({
        where: eq(twoFactorAuth.userId, input.userId),
      });

      if (!tfa || !tfa.totpSecret) {
        throw new Error("2FA not set up for this user");
      }

      const isValid = authenticator.verify({
        token: input.code,
        secret: tfa.totpSecret,
      });

      if (!isValid) {
        throw new Error("Invalid verification code");
      }

      await db
        .update(twoFactorAuth)
        .set({
          isEnabled: true,
          enabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(twoFactorAuth.userId, input.userId));

      return { success: true };
    }),

  disable2FA: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        password: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.passwordHash) {
        const isValid = await verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Password is incorrect");
        }
      }

      await db.delete(twoFactorAuth).where(eq(twoFactorAuth.userId, input.userId));

      return { success: true };
    }),

  get2FAStatus: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const tfa = await db.query.twoFactorAuth.findFirst({
        where: eq(twoFactorAuth.userId, input.userId),
      });

      return {
        enabled: tfa?.isEnabled || false,
        method: tfa?.method || null,
        enabledAt: tfa?.enabledAt || null,
      };
    }),

  listSessions: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.userSessions.findMany({
        where: and(
          eq(userSessions.userId, input.userId),
          sql`${userSessions.revokedAt} IS NULL`,
          sql`${userSessions.expiresAt} > NOW()`,
        ),
        orderBy: [desc(userSessions.lastActivityAt)],
      });
    }),

  revokeSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const session = await db.query.userSessions.findFirst({
        where: and(eq(userSessions.id, input.sessionId), eq(userSessions.userId, input.userId)),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.id, input.sessionId));

      return { success: true };
    }),

  revokeAllSessions: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        exceptCurrent: z.boolean().default(false),
        currentSessionId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(userSessions.userId, input.userId),
        sql`${userSessions.revokedAt} IS NULL`,
        sql`${userSessions.expiresAt} > NOW()`,
      ];

      if (input.exceptCurrent && input.currentSessionId) {
        conditions.push(sql`${userSessions.id} != ${input.currentSessionId}`);
      }

      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(and(...conditions));

      return { success: true };
    }),

  listRoles: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.roles.findMany({
        where: and(eq(roles.organizationId, input.organizationId), isNull(roles.deletedAt)),
        orderBy: [roles.name],
      });
    }),

  getRole: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.roles.findFirst({
        where: eq(roles.id, input.id),
        with: {
          permissions: {
            with: {
              permission: true,
            },
          },
        },
      });
    }),

  updateRole: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        ticketViewScope: z.enum(["all", "group", "self"]).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(roles)
        .set({
          name: input.name,
          description: input.description,
          ticketViewScope: input.ticketViewScope,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, input.id))
        .returning();
      return updated;
    }),

  invite: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        email: z.string().email(),
        roleIds: z.array(z.number()),
        invitedBy: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existingUser = await db.query.users.findFirst({
        where: and(
          eq(users.email, input.email.toLowerCase()),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const { createInvite } = await import("../services/inviteService");
      const invite = await createInvite({
        organizationId: input.organizationId,
        email: input.email.toLowerCase(),
        roleIds: input.roleIds,
        invitedBy: input.invitedBy,
        token: inviteToken,
        expiresAt: inviteExpiresAt,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      return invite;
    }),

  passwordReset: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        resetBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.userId),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
      });

      if (!user) {
        throw new Error("User not found");
      }

      const resetToken = crypto.randomUUID();
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const { createPasswordReset } = await import("../services/passwordResetService");
      const _reset = await createPasswordReset({
        userId: input.userId,
        token: resetToken,
        expiresAt: resetExpiresAt,
        requestedBy: input.resetBy,
      });

      const { sendPasswordResetEmail } = await import("../services/emailService");
      await sendPasswordResetEmail(user.email, resetToken);

      return { success: true, message: "Password reset email sent" };
    }),

  getPermissions: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async () => {
      return listPermissions();
    }),

  getRoleWithPermissions: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return getRoleWithPermissions(input.id);
    }),

  createRole: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100),
        description: z.string().optional(),
        ticketViewScope: z.enum(["all", "group", "self"]).default("all"),
        permissionIds: z.array(z.number()).optional(),
        createdBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const existingRole = await db.query.roles.findFirst({
        where: and(eq(roles.organizationId, input.organizationId), eq(roles.slug, input.slug)),
      });

      if (existingRole) {
        throw new Error("Role with this slug already exists");
      }

      return createRole({
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        ticketViewScope: input.ticketViewScope,
        permissionIds: input.permissionIds,
        createdBy: input.createdBy,
      });
    }),

  updateRolePermissions: publicProcedure
    .input(
      z.object({
        roleId: z.number(),
        permissionIds: z.array(z.number()),
        updatedBy: z.number(),
        userId: z.number().optional(),
        organizationId: z.number().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return updateRolePermissions({
        roleId: input.roleId,
        permissionIds: input.permissionIds,
        updatedBy: input.updatedBy,
        auditContext: input.userId
          ? {
              userId: input.userId,
              organizationId: input.organizationId,
              ipAddress: input.ipAddress,
              userAgent: input.userAgent,
            }
          : undefined,
      });
    }),

  deleteRole: publicProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number().optional(),
        organizationId: z.number().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return deleteRole({
        roleId: input.roleId,
        auditContext: input.userId
          ? {
              userId: input.userId,
              organizationId: input.organizationId,
              ipAddress: input.ipAddress,
              userAgent: input.userAgent,
            }
          : undefined,
      });
    }),

  getUserPermissions: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        isPlatformAdmin: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return getUserPermissions({
        userId: input.userId,
        organizationId: input.organizationId,
        isPlatformAdmin: input.isPlatformAdmin,
      });
    }),

  checkPermission: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        permission: z.string(),
        isPlatformAdmin: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return hasPermission(
        {
          userId: input.userId,
          organizationId: input.organizationId,
          isPlatformAdmin: input.isPlatformAdmin,
        },
        input.permission,
      );
    }),

  listGroups: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return listGroups(input.organizationId);
    }),

  createGroup: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        defaultTeamId: z.number().optional(),
        createdBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return createGroup({
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        defaultTeamId: input.defaultTeamId,
        createdBy: input.createdBy,
      });
    }),

  updateGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        defaultTeamId: z.number().optional(),
        isActive: z.boolean().optional(),
        updatedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return updateGroup({
        groupId: input.groupId,
        name: input.name,
        description: input.description,
        defaultTeamId: input.defaultTeamId,
        isActive: input.isActive,
        updatedBy: input.updatedBy,
      });
    }),

  deleteGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        force: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return deleteGroup({
        groupId: input.groupId,
        force: input.force,
      });
    }),

  listTeams: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        groupId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return listTeams(input.organizationId, input.groupId);
    }),

  createTeam: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        groupId: z.number().optional(),
        autoAssignMethod: z.enum(["round_robin", "least_load", "random"]).default("round_robin"),
        createdBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return createTeam({
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        groupId: input.groupId,
        autoAssignMethod: input.autoAssignMethod,
        createdBy: input.createdBy,
      });
    }),

  updateTeam: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        groupId: z.number().optional(),
        autoAssignMethod: z.enum(["round_robin", "least_load", "random"]).optional(),
        isActive: z.boolean().optional(),
        updatedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return updateTeam({
        teamId: input.teamId,
        name: input.name,
        description: input.description,
        groupId: input.groupId,
        autoAssignMethod: input.autoAssignMethod,
        isActive: input.isActive,
        updatedBy: input.updatedBy,
      });
    }),

  deleteTeam: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return deleteTeam(input.teamId);
    }),

  assignUserToTeam: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        teamId: z.number(),
        isLead: z.boolean().optional(),
        assignedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return assignUserToTeam({
        userId: input.userId,
        teamId: input.teamId,
        isLead: input.isLead,
        assignedBy: input.assignedBy,
      });
    }),

  removeUserFromTeam: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        teamId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return removeUserFromTeam({
        userId: input.userId,
        teamId: input.teamId,
      });
    }),

  seedSystemRoles: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await seedDefaultPermissions();
      await seedSystemRoles(input.organizationId);
      return { success: true };
    }),

  getUsersByPermission: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        permission: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return getUsersByPermission(input.organizationId, input.permission);
    }),

  createApiKey: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
        name: z.string().min(1).max(150),
        scopes: z.array(z.string()),
        expiresAt: z.date().optional(),
        createdBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const keyPrefix = `sk_${crypto.randomUUID().replace(/-/g, "").substring(0, 8)}`;
      const keyData = `${keyPrefix}_${crypto.randomUUID()}_${Date.now()}`;
      const keyHash = await hashPassword(keyData);

      const [newKey] = await db
        .insert(apiKeys)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          name: input.name,
          keyHash,
          keyPrefix,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
          createdBy: input.createdBy,
        })
        .returning();

      await createAuditLog(
        {
          userId: input.createdBy,
          organizationId: input.organizationId,
        },
        {
          action: "API_KEY_CREATE",
          resourceType: "api_key",
          resourceId: newKey.id.toString(),
          metadata: { name: input.name, scopes: input.scopes },
        },
      );

      return {
        id: newKey.id,
        uuid: newKey.uuid,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        key: keyData,
        scopes: newKey.scopes,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      };
    }),

  listApiKeys: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(apiKeys.organizationId, input.organizationId),
        sql`${apiKeys.revokedAt} IS NULL`,
      ];

      if (input.userId) {
        conditions.push(eq(apiKeys.userId, input.userId));
      }

      return db.query.apiKeys.findMany({
        where: and(...conditions),
        orderBy: [desc(apiKeys.createdAt)],
      });
    }),

  revokeApiKey: publicProcedure
    .input(
      z.object({
        keyId: z.number(),
        revokedBy: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const key = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, input.keyId), eq(apiKeys.organizationId, input.organizationId)),
      });

      if (!key) {
        throw new Error("API key not found");
      }

      await db
        .update(apiKeys)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, input.keyId));

      await createAuditLog(
        {
          userId: input.revokedBy,
          organizationId: input.organizationId,
        },
        {
          action: "API_KEY_REVOKE",
          resourceType: "api_key",
          resourceId: input.keyId.toString(),
        },
      );

      return { success: true };
    }),

  updateUserRoles: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        roleIds: z.array(z.number()),
        updatedBy: z.number(),
        organizationId: z.number(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.id, input.userId),
          eq(users.organizationId, input.organizationId),
          isNull(users.deletedAt),
        ),
      });

      if (!user) {
        throw new Error("User not found");
      }

      const existingRoles = await db.query.userRoles.findMany({
        where: eq(userRoles.userId, input.userId),
      });

      const oldRoleIds = existingRoles.map((r) => r.roleId).sort();

      await db.delete(userRoles).where(eq(userRoles.userId, input.userId));

      if (input.roleIds.length > 0) {
        await db.insert(userRoles).values(
          input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
            createdBy: input.updatedBy,
          })),
        );
      }

      await createAuditLog(
        {
          userId: input.updatedBy,
          organizationId: input.organizationId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        {
          action: "USER_ROLE_UPDATE",
          resourceType: "user",
          resourceId: input.userId.toString(),
          changes: trackChanges({ roles: oldRoleIds }, { roles: input.roleIds.sort() }),
        },
      );

      return db.query.users.findFirst({
        where: eq(users.id, input.userId),
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      });
    }),
};
