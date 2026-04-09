import { db } from "@ticket-app/db";
import { onPremiseLicenses } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const onPremiseRouter = {
  getLicense: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      const [license] = await db
        .select()
        .from(onPremiseLicenses)
        .where(eq(onPremiseLicenses.organizationId, input.organizationId));
      return license ?? null;
    }),

  verifyLicense: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        licenseKey: z.string(),
        domain: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const [license] = await db
        .insert(onPremiseLicenses)
        .values({
          organizationId: input.organizationId,
          licenseKey: input.licenseKey,
          domain: input.domain,
          isVerified: false,
        })
        .returning();
      return license;
    }),

  updateLicense: publicProcedure
    .input(
      z.object({
        id: z.number(),
        isVerified: z.boolean().optional(),
        seatCount: z.number().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(onPremiseLicenses)
        .set({
          isVerified: input.isVerified,
          seatCount: input.seatCount,
          expiresAt: input.expiresAt,
        })
        .where(eq(onPremiseLicenses.id, input.id))
        .returning();
      return updated;
    }),

  deleteLicense: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(onPremiseLicenses).where(eq(onPremiseLicenses.id, input.id));
      return { success: true };
    }),
};
