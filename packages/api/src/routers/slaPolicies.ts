import { eq, and, isNull } from "drizzle-orm";
import * as z from "zod";

import { db } from "@ticket-app/db";
import { slaPolicies, slaPolicyTargets } from "@ticket-app/db/schema/_sla";
import { lookups, lookupTypes } from "@ticket-app/db/schema/_lookups";
import { publicProcedure } from "../index";

const businessHoursConfigSchema = z.object({
  timezone: z.string().default("UTC"),
  schedule: z.array(
    z.object({
      day: z.coerce.number().min(0).max(6),
      startHour: z.coerce.number().min(0).max(23),
      startMinute: z.coerce.number().min(0).max(59),
      endHour: z.coerce.number().min(0).max(23),
      endMinute: z.coerce.number().min(0).max(59),
    }),
  ),
});

const holidaySchema = z.array(
  z.object({
    date: z.string(),
    name: z.string(),
  }),
);

export const slaPoliciesRouter = {
  list: publicProcedure.handler(async () => {
    return await db.query.slaPolicies.findMany({
      where: isNull(slaPolicies.deletedAt),
      with: {
        targets: {
          with: {
            priority: true,
          },
        },
      },
    });
  }),

  get: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    return await db.query.slaPolicies.findFirst({
      where: and(eq(slaPolicies.id, input.id), isNull(slaPolicies.deletedAt)),
      with: {
        targets: {
          with: {
            priority: true,
            escalateAgent: true,
            escalateTeam: true,
          },
        },
      },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        isDefault: z.coerce.boolean().default(false),
        businessHoursOnly: z.coerce.boolean().default(true),
        businessHoursConfig: businessHoursConfigSchema.optional(),
        holidays: holidaySchema.optional(),
      }),
    )
    .handler(async ({ input }) => {
      return await db
        .insert(slaPolicies)
        .values({
          organizationId: input.organizationId ?? null,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault,
          businessHoursOnly: input.businessHoursOnly,
          businessHoursConfig: input.businessHoursConfig ?? null,
          holidays: input.holidays ?? null,
        })
        .returning();
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        name: z.string().min(1).max(150).optional(),
        description: z.string().optional(),
        isDefault: z.coerce.boolean().optional(),
        businessHoursOnly: z.coerce.boolean().optional(),
        businessHoursConfig: businessHoursConfigSchema.optional(),
        holidays: holidaySchema.optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...values } = input;
      return await db
        .update(slaPolicies)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(and(eq(slaPolicies.id, id), isNull(slaPolicies.deletedAt)))
        .returning();
    }),

  delete: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    return await db
      .update(slaPolicies)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(slaPolicies.id, input.id), isNull(slaPolicies.deletedAt)))
      .returning();
  }),

  listTargets: publicProcedure
    .input(z.object({ policyId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db.query.slaPolicyTargets.findMany({
        where: eq(slaPolicyTargets.slaPolicyId, input.policyId),
        with: {
          priority: true,
          escalateAgent: true,
          escalateTeam: true,
        },
      });
    }),

  createTarget: publicProcedure
    .input(
      z.object({
        slaPolicyId: z.coerce.number(),
        priorityId: z.coerce.number(),
        firstResponseMinutes: z.coerce.number().min(1),
        resolutionMinutes: z.coerce.number().min(1),
        escalateAgentId: z.coerce.number().optional(),
        escalateTeamId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.insert(slaPolicyTargets).values(input).returning();
    }),

  updateTarget: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        firstResponseMinutes: z.coerce.number().min(1).optional(),
        resolutionMinutes: z.coerce.number().min(1).optional(),
        escalateAgentId: z.coerce.number().optional(),
        escalateTeamId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...values } = input;
      return await db
        .update(slaPolicyTargets)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(slaPolicyTargets.id, id))
        .returning();
    }),

  deleteTarget: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db.delete(slaPolicyTargets).where(eq(slaPolicyTargets.id, input.id)).returning();
    }),

  getPriorities: publicProcedure.handler(async () => {
    const priorityType = await db.query.lookupTypes.findFirst({
      where: eq(lookupTypes.name, "priority"),
    });
    if (!priorityType) return [];

    return await db.query.lookups.findMany({
      where: eq(lookups.lookupTypeId, priorityType.id),
      with: {
        organization: true,
      },
    });
  }),
};
