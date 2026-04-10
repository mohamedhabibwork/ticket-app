import { Worker, Job } from "bullmq";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as XLSX from "xlsx";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { db } from "@ticket-app/db";
import {
  excelExportJobs,
  tickets,
  contacts,
  users,
  lookups,
  teams,
  savedReplies,
  savedReplyFolders,
  kbArticles,
  kbCategories,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { type ExcelExportJobData } from "../queue";

const EXCEL_EXPORT_QUEUE = `${env.QUEUE_PREFIX}-excel-export`;

export interface ExcelExportResult {
  fileUrl: string;
  recordCount: number;
  success: boolean;
  error?: string;
}

function getS3Client(): S3Client {
  if (env.STORAGE_PROVIDER === "minio" || env.STORAGE_PROVIDER === "s3") {
    return new S3Client({
      region: env.STORAGE_REGION,
      endpoint: env.STORAGE_ENDPOINT,
      credentials:
        env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY
          ? {
              accessKeyId: env.STORAGE_ACCESS_KEY,
              secretAccessKey: env.STORAGE_SECRET_KEY,
            }
          : undefined,
      forcePathStyle: env.STORAGE_PROVIDER === "minio",
    });
  }
  throw new Error(`Unsupported storage provider: ${env.STORAGE_PROVIDER}`);
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  if (env.STORAGE_PUBLIC_URL) {
    return `${env.STORAGE_PUBLIC_URL}/${key}`;
  }

  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  });
  return getSignedUrl(command, { expiresIn: 3600 });
}

async function updateJobStatus(
  jobId: string,
  status: "pending" | "processing" | "completed" | "failed",
  updates: {
    fileUrl?: string;
    recordCount?: number;
    errorMessage?: string;
    completedAt?: Date;
  } = {},
): Promise<void> {
  await db
    .update(excelExportJobs)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(excelExportJobs.uuid, jobId));
}

async function buildTicketExportData(
  organizationId: number,
  filters?: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const conditions = [eq(tickets.organizationId, organizationId), isNull(tickets.deletedAt)];

  if (filters?.statusId) {
    conditions.push(eq(tickets.statusId, filters.statusId as number));
  }
  if (filters?.priorityId) {
    conditions.push(eq(tickets.priorityId, filters.priorityId as number));
  }
  if (filters?.assignedAgentId) {
    conditions.push(eq(tickets.assignedAgentId, filters.assignedAgentId as number));
  }

  const ticketRows = await db
    .select({
      id: tickets.id,
      referenceNumber: tickets.referenceNumber,
      subject: tickets.subject,
      statusId: tickets.statusId,
      priorityId: tickets.priorityId,
      channelId: tickets.channelId,
      contactEmail: contacts.email,
      assigneeEmail: users.email,
      teamName: teams.name,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .leftJoin(contacts, eq(tickets.contactId, contacts.id))
    .leftJoin(users, eq(tickets.assignedAgentId, users.id))
    .leftJoin(teams, eq(tickets.assignedTeamId, teams.id))
    .where(and(...conditions))
    .orderBy(desc(tickets.createdAt))
    .limit(50000);

  const statusLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 1));

  const priorityLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 2));

  const statusMap = new Map(statusLookups.map((s) => [s.id, s.name]));
  const priorityMap = new Map(priorityLookups.map((p) => [p.id, p.name]));

  return ticketRows.map((row) => ({
    reference: row.referenceNumber,
    subject: row.subject,
    status: statusMap.get(row.statusId) || "Unknown",
    priority: priorityMap.get(row.priorityId) || "Unknown",
    contact_email: row.contactEmail || "",
    assignee_email: row.assigneeEmail || "",
    team: row.teamName || "",
    created_at: row.createdAt?.toISOString() || "",
    updated_at: row.updatedAt?.toISOString() || "",
  }));
}

async function buildContactExportData(organizationId: number): Promise<Record<string, unknown>[]> {
  const contactRows = await db
    .select({
      email: contacts.email,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      phone: contacts.phone,
      company: contacts.company,
      typeId: contacts.contactTypeId,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(eq(contacts.organizationId, organizationId), isNull(contacts.deletedAt)))
    .orderBy(desc(contacts.createdAt))
    .limit(50000);

  const typeLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 10));

  const typeMap = new Map(typeLookups.map((t) => [t.id, t.name]));

  return contactRows.map((row) => ({
    email: row.email || "",
    first_name: row.firstName || "",
    last_name: row.lastName || "",
    phone: row.phone || "",
    company: row.company || "",
    type: typeMap.get(row.typeId) || "",
    created_at: row.createdAt?.toISOString() || "",
  }));
}

async function buildUserExportData(organizationId: number): Promise<Record<string, unknown>[]> {
  const userRows = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.isActive,
      teamId: teams.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(teams, eq(users.organizationId, teams.id))
    .where(and(eq(users.organizationId, organizationId), isNull(users.deletedAt)))
    .orderBy(desc(users.createdAt))
    .limit(50000);

  return userRows.map((row) => ({
    email: row.email || "",
    first_name: row.firstName || "",
    last_name: row.lastName || "",
    role: row.role ? "active" : "inactive",
    team: row.teamId || "",
    created_at: row.createdAt?.toISOString() || "",
  }));
}

async function buildKbArticleExportData(
  organizationId: number,
): Promise<Record<string, unknown>[]> {
  const articleRows = await db
    .select({
      title: kbArticles.title,
      categoryId: kbArticles.categoryId,
      statusId: kbArticles.status,
      locale: kbArticles.locale,
      authorId: kbArticles.authorId,
      createdAt: kbArticles.createdAt,
      updatedAt: kbArticles.updatedAt,
    })
    .from(kbArticles)
    .where(and(eq(kbArticles.organizationId, organizationId), isNull(kbArticles.deletedAt)))
    .orderBy(desc(kbArticles.createdAt))
    .limit(50000);

  const categoryRows = await db
    .select({ id: kbCategories.id, name: kbCategories.name })
    .from(kbCategories);

  const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

  const statusLookups = await db
    .select({ id: lookups.id, name: lookups.name })
    .from(lookups)
    .where(eq(lookups.lookupTypeId, 6));

  const statusMap = new Map(statusLookups.map((s) => [s.id, s.name]));

  return articleRows.map((row) => ({
    title: row.title || "",
    category: categoryMap.get(row.categoryId) || "",
    status: statusMap.get(row.statusId) || "",
    locale: row.locale || "",
    created_at: row.createdAt?.toISOString() || "",
    updated_at: row.updatedAt?.toISOString() || "",
  }));
}

async function buildSavedReplyExportData(
  organizationId: number,
): Promise<Record<string, unknown>[]> {
  const replyRows = await db
    .select({
      title: savedReplies.title,
      content: savedReplies.content,
      folderId: savedReplies.folderId,
      scope: savedReplies.scope,
      createdAt: savedReplies.createdAt,
    })
    .from(savedReplies)
    .leftJoin(savedReplyFolders, eq(savedReplies.folderId, savedReplyFolders.id))
    .where(and(eq(savedReplies.organizationId, organizationId), isNull(savedReplies.deletedAt)))
    .orderBy(desc(savedReplies.createdAt))
    .limit(50000);

  return replyRows.map((row) => ({
    title: row.title || "",
    content: row.content || "",
    folder: row.folderId || "",
    scope: row.scope || "",
    created_at: row.createdAt?.toISOString() || "",
  }));
}

export function createExcelExportQueueWorker(): Worker {
  return new Worker(
    EXCEL_EXPORT_QUEUE,
    async (job: Job<ExcelExportJobData>) => {
      const { jobId, organizationId, entityType, filters } = job.data;

      await updateJobStatus(jobId, "processing");

      try {
        let data: Record<string, unknown>[] = [];
        let headers: string[] = [];

        switch (entityType) {
          case "tickets":
            data = await buildTicketExportData(organizationId, filters);
            headers = [
              "reference",
              "subject",
              "status",
              "priority",
              "contact_email",
              "assignee_email",
              "team",
              "created_at",
              "updated_at",
            ];
            break;
          case "contacts":
            data = await buildContactExportData(organizationId);
            headers = [
              "email",
              "first_name",
              "last_name",
              "phone",
              "company",
              "type",
              "created_at",
            ];
            break;
          case "users":
            data = await buildUserExportData(organizationId);
            headers = ["email", "first_name", "last_name", "role", "team", "created_at"];
            break;
          case "kb_articles":
            data = await buildKbArticleExportData(organizationId);
            headers = ["title", "category", "status", "locale", "created_at", "updated_at"];
            break;
          case "saved_replies":
            data = await buildSavedReplyExportData(organizationId);
            headers = ["title", "content", "folder", "scope", "created_at"];
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, entityType);

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        const fileName = `exports/${organizationId}/${entityType}_${Date.now()}.xlsx`;
        const fileUrl = await uploadToS3(
          buffer,
          fileName,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );

        await updateJobStatus(jobId, "completed", {
          fileUrl,
          recordCount: data.length,
          completedAt: new Date(),
        });

        return { fileUrl, recordCount: data.length, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await updateJobStatus(jobId, "failed", {
          errorMessage,
          completedAt: new Date(),
        });
        throw error;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );
}

export async function addExcelExportJob(
  data: ExcelExportJobData,
): Promise<Job<ExcelExportJobData>> {
  const { excelExportQueue } = await import("../queue");
  return excelExportQueue.add("excel-export", data);
}

// Alias for backwards compatibility
export const createExcelExportWorker = createExcelExportQueueWorker;
export async function closeExcelExportQueue(): Promise<void> {
  const { excelExportQueue } = await import("../queue");
  await excelExportQueue.close();
}
