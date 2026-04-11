import { db } from "@ticket-app/db";
import { onPremiseLicenses, users } from "@ticket-app/db/schema";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import {
  verifyLicenseKey,
  validateSeatLimit,
  isOnPremiseMode,
  isMultiTenantBillingDisabled,
} from "../lib/license";
import { addLicenseVerificationJob } from "@ticket-app/queue";

export const onPremiseRouter = {
  getLicense: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: On-premise read permission required");
      }

      const [license] = await db
        .select()
        .from(onPremiseLicenses)
        .where(eq(onPremiseLicenses.organizationId, input.organizationId));
      return license ?? null;
    }),

  verifyLicense: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        licenseKey: z.string(),
        domain: z.string(),
        signature: z.string(),
        productEdition: z.string(),
        seatLimit: z.coerce.number(),
        validUntil: z.date(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: On-premise write permission required");
      }

      const result = await verifyLicenseKey(input.licenseKey, input.domain, input.signature);

      if (!result.valid) {
        return {
          success: false,
          error: result.error,
          isVerified: false,
        };
      }

      const existing = await db.query.onPremiseLicenses.findFirst({
        where: eq(onPremiseLicenses.organizationId, input.organizationId),
      });

      if (existing) {
        const [updated] = await db
          .update(onPremiseLicenses)
          .set({
            licenseKey: input.licenseKey,
            productEdition: input.productEdition,
            seatLimit: input.seatLimit,
            validUntil: input.validUntil,
            signature: input.signature,
            isActive: true,
            lastVerificationAt: new Date(),
          })
          .where(eq(onPremiseLicenses.id, existing.id))
          .returning();
        return {
          success: true,
          license: updated,
          isVerified: true,
          details: result.details,
        };
      }

      const [license] = await db
        .insert(onPremiseLicenses)
        .values({
          organizationId: input.organizationId,
          licenseKey: input.licenseKey,
          productEdition: input.productEdition,
          seatLimit: input.seatLimit,
          validUntil: input.validUntil,
          signature: input.signature,
          isActive: true,
          lastVerificationAt: new Date(),
        })
        .returning();

      if (!license) {
        throw new Error("Failed to insert license record");
      }

      await addLicenseVerificationJob({ type: "verify-license", licenseId: license.id });

      return {
        success: true,
        license,
        isVerified: true,
        details: result.details,
      };
    }),

  checkSeatLimit: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: On-premise read permission required");
      }

      const license = await db.query.onPremiseLicenses.findFirst({
        where: eq(onPremiseLicenses.organizationId, input.organizationId),
      });

      if (!license || !license.isActive) {
        return { enforced: false, message: "No active license" };
      }

      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.organizationId, input.organizationId));

      const result = await validateSeatLimit(
        input.organizationId,
        userCount[0]?.count ?? 0,
        Number(license.seatLimit),
      );

      return {
        enforced: true,
        allowed: result.allowed,
        currentCount: userCount[0]?.count ?? 0,
        seatLimit: license.seatLimit,
        message: result.message,
      };
    }),

  getLicenseStatus: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: On-premise read permission required");
      }

      const license = await db.query.onPremiseLicenses.findFirst({
        where: eq(onPremiseLicenses.organizationId, input.organizationId),
      });

      if (!license) {
        return {
          isActive: false,
          mode: "unlicensed",
          features: { multiTenant: true, billing: true },
        };
      }

      const isExpired = license.validUntil && new Date(license.validUntil) < new Date();
      const isValid = license.isActive && !isExpired;

      return {
        isActive: isValid,
        mode: isOnPremiseMode() ? "on_premise" : "cloud",
        productEdition: license.productEdition,
        seatLimit: license.seatLimit,
        validUntil: license.validUntil,
        lastVerified: license.lastVerificationAt,
        features: {
          multiTenant: !isMultiTenantBillingDisabled(),
          billing: !isMultiTenantBillingDisabled(),
        },
      };
    }),

  updateLicense: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        isActive: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: On-premise write permission required");
      }

      const [updated] = await db
        .update(onPremiseLicenses)
        .set({
          isActive: input.isActive,
        })
        .where(eq(onPremiseLicenses.id, input.id))
        .returning();
      return updated;
    }),

  deleteLicense: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: On-premise write permission required");
      }

      await db.delete(onPremiseLicenses).where(eq(onPremiseLicenses.id, input.id));
      return { success: true };
    }),
};
