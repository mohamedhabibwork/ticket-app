import { eq, and, count } from "drizzle-orm";
import * as z from "zod";

import { db } from "@ticket-app/db";
import { excelExportJobs, excelImportJobs } from "@ticket-app/db/schema";
import { publicProcedure } from "../index";
import { addExcelExportJob, addExcelImportJob } from "@ticket-app/queue";

const EntityTypeEnum = z.enum(["tickets", "contacts", "users", "kb_articles", "saved_replies"]);
const _ExportStatusEnum = z.enum(["pending", "processing", "completed", "failed"]);
const _ImportStatusEnum = z.enum(["pending", "validating", "processing", "completed", "failed"]);
const ImportModeEnum = z.enum(["create", "upsert"]);

export const excelRouter = {
  createExportJob: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
        entityType: EntityTypeEnum,
        filters: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { organizationId, userId, entityType, filters } = input;

      const activeExportsCount = await db
        .select({ count: count() })
        .from(excelExportJobs)
        .where(
          and(
            eq(excelExportJobs.organizationId, organizationId),
            eq(excelExportJobs.status, "processing"),
          ),
        );

      if (activeExportsCount[0].count >= 3) {
        throw new Error("Maximum concurrent exports (3) reached for this organization");
      }

      const [job] = await db
        .insert(excelExportJobs)
        .values({
          organizationId,
          userId,
          entityType,
          filters: filters || null,
          status: "pending",
        })
        .returning();

      await addExcelExportJob({
        jobId: job.uuid,
        organizationId,
        userId,
        entityType,
        filters,
      });

      return {
        jobId: job.uuid,
        status: job.status,
      };
    }),

  getExportJobStatus: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { jobId, organizationId } = input;

      const job = await db.query.excelExportJobs.findFirst({
        where: and(
          eq(excelExportJobs.uuid, jobId),
          eq(excelExportJobs.organizationId, organizationId),
        ),
      });

      if (!job) {
        throw new Error("Export job not found");
      }

      return {
        jobId: job.uuid,
        status: job.status,
        entityType: job.entityType,
        recordCount: job.recordCount,
        fileUrl: job.fileUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
    }),

  getExportDownloadUrl: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { jobId, organizationId } = input;

      const job = await db.query.excelExportJobs.findFirst({
        where: and(
          eq(excelExportJobs.uuid, jobId),
          eq(excelExportJobs.organizationId, organizationId),
        ),
      });

      if (!job) {
        throw new Error("Export job not found");
      }

      if (job.status !== "completed") {
        throw new Error("Export job not yet completed");
      }

      if (!job.fileUrl) {
        throw new Error("Export file URL not available");
      }

      return {
        downloadUrl: job.fileUrl,
      };
    }),

  createImportJob: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number(),
        entityType: EntityTypeEnum,
        fileUrl: z.string().url(),
        mode: ImportModeEnum.default("create"),
        matchField: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { organizationId, userId, entityType, fileUrl, mode, matchField } = input;

      if (mode === "upsert" && !matchField) {
        throw new Error("matchField is required for upsert mode");
      }

      const [job] = await db
        .insert(excelImportJobs)
        .values({
          organizationId,
          userId,
          entityType,
          fileUrl,
          mode,
          matchField: matchField || null,
          status: "pending",
        })
        .returning();

      await addExcelImportJob({
        jobId: job.uuid,
        organizationId,
        userId,
        entityType,
        fileUrl,
        mode,
        matchField,
      });

      return {
        jobId: job.uuid,
        status: job.status,
      };
    }),

  getImportJobStatus: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { jobId, organizationId } = input;

      const job = await db.query.excelImportJobs.findFirst({
        where: and(
          eq(excelImportJobs.uuid, jobId),
          eq(excelImportJobs.organizationId, organizationId),
        ),
      });

      if (!job) {
        throw new Error("Import job not found");
      }

      return {
        jobId: job.uuid,
        status: job.status,
        entityType: job.entityType,
        mode: job.mode,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successCount: job.successCount,
        errorCount: job.errorCount,
        errors: job.errors || [],
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      };
    }),

  listExportJobs: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { organizationId, limit, offset } = input;

      const jobs = await db.query.excelExportJobs.findMany({
        where: eq(excelExportJobs.organizationId, organizationId),
        orderBy: (excelExportJobs, { desc }) => [desc(excelExportJobs.createdAt)],
        limit,
        offset,
      });

      return jobs.map((job) => ({
        jobId: job.uuid,
        status: job.status,
        entityType: job.entityType,
        recordCount: job.recordCount,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }));
    }),

  listImportJobs: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const { organizationId, limit, offset } = input;

      const jobs = await db.query.excelImportJobs.findMany({
        where: eq(excelImportJobs.organizationId, organizationId),
        orderBy: (excelImportJobs, { desc }) => [desc(excelImportJobs.createdAt)],
        limit,
        offset,
      });

      return jobs.map((job) => ({
        jobId: job.uuid,
        status: job.status,
        entityType: job.entityType,
        mode: job.mode,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successCount: job.successCount,
        errorCount: job.errorCount,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      }));
    }),
};
