import { Worker, Job } from "bullmq";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@ticket-app/db";
import { excelImportJobs, tickets, contacts, users, lookups, teams } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { type ExcelImportJobData } from "../queue";

const EXCEL_IMPORT_QUEUE = `${process.env.QUEUE_PREFIX || "ticket-app"}:excel:import`;

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  success: boolean;
}

const BATCH_SIZE = 100;
const MAX_ROWS = 50000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function updateJobStatus(
  jobId: string,
  status: "pending" | "validating" | "processing" | "completed" | "failed",
  updates: {
    totalRows?: number;
    processedRows?: number;
    successCount?: number;
    errorCount?: number;
    errors?: ImportError[];
    completedAt?: Date;
  } = {},
): Promise<void> {
  await db
    .update(excelImportJobs)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(excelImportJobs.uuid, jobId));
}

function validateFile(buffer: Buffer): { isValid: boolean; error?: string; rowCount?: number } {
  if (buffer.length > MAX_FILE_SIZE) {
    return { isValid: false, error: `File size exceeds ${MAX_FILE_SIZE} bytes limit` };
  }

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { isValid: false, error: "Excel file has no sheets" };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

    if (data.length < 2) {
      return {
        isValid: false,
        error: "Excel file must have at least a header row and one data row",
      };
    }

    return { isValid: true, rowCount: data.length - 1 };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Failed to parse Excel file",
    };
  }
}

async function parseTicketsFromExcel(
  rows: Record<string, unknown>[],
  organizationId: number,
  userId: number,
): Promise<{ successCount: number; errorCount: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let successCount = 0;
  let errorCount = 0;

  const statusLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 1));

  const priorityLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 2));

  const statusMap = new Map(statusLookups.map((s) => [s.name.toLowerCase(), s.id]));
  const priorityMap = new Map(priorityLookups.map((p) => [p.name.toLowerCase(), p.id]));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE);

    for (const row of batch) {
      const rowNum = batchNum * BATCH_SIZE + batch.indexOf(row) + 2;
      try {
        const subject = row["subject"] as string;
        if (!subject) {
          errors.push({ row: rowNum, field: "subject", message: "Subject is required" });
          errorCount++;
          continue;
        }

        const statusName = (row["status"] as string)?.toLowerCase();
        const statusId = statusMap.get(statusName);
        if (!statusId) {
          errors.push({
            row: rowNum,
            field: "status",
            message: `Invalid status: ${row["status"]}`,
          });
          errorCount++;
          continue;
        }

        const priorityName = (row["priority"] as string)?.toLowerCase();
        const priorityId = priorityMap.get(priorityName);
        if (!priorityId) {
          errors.push({
            row: rowNum,
            field: "priority",
            message: `Invalid priority: ${row["priority"]}`,
          });
          errorCount++;
          continue;
        }

        let contactId: number | undefined;
        const contactEmail = row["contact_email"] as string;
        if (contactEmail) {
          const contact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.organizationId, organizationId),
              eq(contacts.email, contactEmail),
            ),
          });
          contactId = contact?.id;
        }

        let assignedAgentId: number | undefined;
        const assigneeEmail = row["assignee_email"] as string;
        if (assigneeEmail) {
          const agent = await db.query.users.findFirst({
            where: and(eq(users.organizationId, organizationId), eq(users.email, assigneeEmail)),
          });
          assignedAgentId = agent?.id;
        }

        let assignedTeamId: number | undefined;
        const teamName = row["team_name"] as string;
        if (teamName) {
          const team = await db.query.teams.findFirst({
            where: and(eq(teams.organizationId, organizationId), eq(teams.name, teamName)),
          });
          assignedTeamId = team?.id;
        }

        const refNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

        await db.insert(tickets).values({
          organizationId,
          referenceNumber: refNumber,
          subject,
          descriptionHtml: (row["description"] as string) || "",
          statusId,
          priorityId,
          contactId,
          assignedAgentId,
          assignedTeamId,
          createdBy: userId,
        });

        successCount++;
      } catch (err) {
        errors.push({
          row: rowNum,
          field: "general",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        errorCount++;
      }
    }
  }

  return { successCount, errorCount, errors };
}

async function parseContactsFromExcel(
  rows: Record<string, unknown>[],
  organizationId: number,
  userId: number,
): Promise<{ successCount: number; errorCount: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let successCount = 0;
  let errorCount = 0;

  const typeLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 10));

  const typeMap = new Map(typeLookups.map((t) => [t.name.toLowerCase(), t.id]));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE);

    for (const row of batch) {
      const rowNum = batchNum * BATCH_SIZE + batch.indexOf(row) + 2;
      try {
        const email = row["email"] as string;
        if (!email) {
          errors.push({ row: rowNum, field: "email", message: "Email is required" });
          errorCount++;
          continue;
        }

        let contactTypeId: number | undefined;
        const typeName = row["type"] as string;
        if (typeName) {
          contactTypeId = typeMap.get(typeName.toLowerCase());
        }

        await db.insert(contacts).values({
          organizationId,
          email,
          firstName: (row["first_name"] as string) || null,
          lastName: (row["last_name"] as string) || null,
          phone: (row["phone"] as string) || null,
          company: (row["company"] as string) || null,
          contactTypeId,
          createdBy: userId,
        });

        successCount++;
      } catch (err) {
        errors.push({
          row: rowNum,
          field: "general",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        errorCount++;
      }
    }
  }

  return { successCount, errorCount, errors };
}

async function parseUsersFromExcel(
  rows: Record<string, unknown>[],
  organizationId: number,
  userId: number,
): Promise<{ successCount: number; errorCount: number; errors: ImportError[] }> {
  const errors: ImportError[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE);

    for (const row of batch) {
      const rowNum = batchNum * BATCH_SIZE + batch.indexOf(row) + 2;
      try {
        const email = row["email"] as string;
        if (!email) {
          errors.push({ row: rowNum, field: "email", message: "Email is required" });
          errorCount++;
          continue;
        }

        const firstName = row["first_name"] as string;
        if (!firstName) {
          errors.push({ row: rowNum, field: "first_name", message: "First name is required" });
          errorCount++;
          continue;
        }

        const lastName = row["last_name"] as string;
        if (!lastName) {
          errors.push({ row: rowNum, field: "last_name", message: "Last name is required" });
          errorCount++;
          continue;
        }

        await db.insert(users).values({
          organizationId,
          email,
          firstName,
          lastName,
          createdBy: userId,
        });

        successCount++;
      } catch (err) {
        errors.push({
          row: rowNum,
          field: "general",
          message: err instanceof Error ? err.message : "Unknown error",
        });
        errorCount++;
      }
    }
  }

  return { successCount, errorCount, errors };
}

export function createExcelImportQueueWorker(): Worker {
  return new Worker(
    EXCEL_IMPORT_QUEUE,
    async (job: Job<ExcelImportJobData>) => {
      const { jobId, organizationId, userId, entityType, fileUrl, _mode, _matchField } = job.data;

      await updateJobStatus(jobId, "validating");

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const validation = validateFile(buffer);

        if (!validation.isValid) {
          await updateJobStatus(jobId, "failed", {
            errors: [{ row: 0, field: "file", message: validation.error || "Invalid file" }],
          });
          throw new Error(validation.error);
        }

        if (validation.rowCount && validation.rowCount > MAX_ROWS) {
          throw new Error(`File exceeds maximum row count of ${MAX_ROWS}`);
        }

        await updateJobStatus(jobId, "validating", { totalRows: validation.rowCount });

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        await updateJobStatus(jobId, "processing", { processedRows: 0 });

        let result: { successCount: number; errorCount: number; errors: ImportError[] };

        switch (entityType) {
          case "tickets":
            result = await parseTicketsFromExcel(rows, organizationId, userId);
            break;
          case "contacts":
            result = await parseContactsFromExcel(rows, organizationId, userId);
            break;
          case "users":
            result = await parseUsersFromExcel(rows, organizationId, userId);
            break;
          case "kb_articles":
          case "saved_replies":
            result = {
              successCount: 0,
              errorCount: 0,
              errors: [
                { row: 0, field: "entity", message: `${entityType} import not yet implemented` },
              ],
            };
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }

        await updateJobStatus(jobId, "completed", {
          processedRows: result.successCount + result.errorCount,
          successCount: result.successCount,
          errorCount: result.errorCount,
          errors: result.errors,
          completedAt: new Date(),
        });

        return {
          totalRows: rows.length,
          successCount: result.successCount,
          errorCount: result.errorCount,
          errors: result.errors,
          success: true,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await updateJobStatus(jobId, "failed", {
          errors: [{ row: 0, field: "general", message: errorMessage }],
          completedAt: new Date(),
        });
        throw error;
      }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    },
  );
}

export async function addExcelImportJob(
  data: ExcelImportJobData,
): Promise<Job<ExcelImportJobData>> {
  const { excelImportQueue } = await import("../queue");
  return excelImportQueue.add("excel-import", data);
}

export async function closeExcelImportQueue(): Promise<void> {
  const { excelImportQueue } = await import("../queue");
  await excelImportQueue.close();
}
