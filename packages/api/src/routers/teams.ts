import { db } from "@ticket-app/db";
import { teams, teamMembers, users } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const teamsRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(teams)
        .where(eq(teams.organizationId, input.organizationId))
        .orderBy(desc(teams.createdAt));
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.id));
      return team ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        groupId: z.number().optional(),
        autoAssignMethod: z.enum(["round_robin", "load_balanced", "least_assigned"]).default("round_robin"),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [team] = await db
        .insert(teams)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          groupId: input.groupId,
          autoAssignMethod: input.autoAssignMethod,
          createdBy: input.createdBy,
        })
        .returning();
      return team;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
        description: z.string().optional(),
        groupId: z.number().nullable().optional(),
        autoAssignMethod: z.enum(["round_robin", "load_balanced", "least_assigned"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(teams)
        .set({
          name: input.name,
          description: input.description,
          groupId: input.groupId,
          autoAssignMethod: input.autoAssignMethod,
          isActive: input.isActive,
        })
        .where(eq(teams.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, input.id));
      await db.delete(teams).where(eq(teams.id, input.id));
      return { success: true };
    }),

  listMembers: publicProcedure
    .input(z.object({ teamId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select({
          id: teamMembers.id,
          teamId: teamMembers.teamId,
          userId: teamMembers.userId,
          isLead: teamMembers.isLead,
          createdAt: teamMembers.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userAvatarUrl: users.avatarUrl,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, input.teamId));
    }),

  addMember: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        userId: z.number(),
        isLead: z.boolean().default(false),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [member] = await db
        .insert(teamMembers)
        .values({
          teamId: input.teamId,
          userId: input.userId,
          isLead: input.isLead,
          createdBy: input.createdBy,
        })
        .onConflictDoNothing()
        .returning();
      return member;
    }),

  removeMember: publicProcedure
    .input(
      z.object({
        teamId: z.number(),
        userId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, input.teamId),
            eq(teamMembers.userId, input.userId)
          )
        );
      return { success: true };
    }),
};