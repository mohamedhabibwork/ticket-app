import { db } from "@ticket-app/db";
import { ticketAttachments } from "@ticket-app/db/schema/_tickets";
import { eq, and, desc } from "drizzle-orm";
import {
  generateUploadUrl as generatePresignedUpload,
  generateDownloadUrl as generatePresignedDownload,
  getPublicUrl,
  deleteFile as deleteStorageFile,
} from "../lib/storage";
import { env } from "@ticket-app/env/server";

export type AttachmentType = "ticket" | "kb_article" | "contact" | "avatar" | "brand" | "email";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/html",
  "application/zip",
  "application/x-zip-compressed",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface AttachmentRecord {
  id: number;
  uuid: string;
  organizationId: number | null;
  ticketId: number | null;
  ticketMessageId: number | null;
  kbArticleId: number | null;
  contactId: number | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  thumbnailKey: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  createdAt: Date | null;
  createdBy: number | null;
}

export interface GenerateUploadUrlParams {
  organizationId: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  attachmentType: AttachmentType;
  ticketId?: number;
  ticketMessageId?: number;
  kbArticleId?: number;
  contactId?: number;
  expiresIn?: number;
}

export interface GenerateUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  storageKey: string;
  expiresAt: Date;
}

export interface GenerateDownloadUrlParams {
  organizationId: number;
  attachmentId: number;
  expiresIn?: number;
}

export interface GenerateDownloadUrlResult {
  downloadUrl: string;
  publicUrl: string;
  expiresAt: Date;
}

export interface CreateAttachmentParams {
  organizationId: number;
  ticketId?: number;
  ticketMessageId?: number;
  kbArticleId?: number;
  contactId?: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  thumbnailKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  createdBy?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const PRESIGNED_URL_EXPIRY_DEFAULT = 3600; // 1 hour

function getMaxFileSize(): number {
  return env.STORAGE_MAX_FILE_SIZE || DEFAULT_MAX_SIZE_BYTES;
}

function getAttachmentFolder(type: AttachmentType): string {
  switch (type) {
    case "ticket":
      return "tickets";
    case "kb_article":
      return "kb-articles";
    case "contact":
      return "contacts";
    case "avatar":
      return "avatars";
    case "brand":
      return "branding";
    case "email":
      return "email-attachments";
    default:
      return "attachments";
  }
}

export function validateFile(contentType: string, sizeBytes: number): FileValidationResult {
  const maxSize = getMaxFileSize();

  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return {
      valid: false,
      error: `File type ${contentType} is not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`,
    };
  }

  return {
    valid: true,
    mimeType: contentType,
    sizeBytes,
  };
}

export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

function buildOrganizationStorageKey(
  organizationId: number,
  attachmentType: AttachmentType,
  filename: string,
): string {
  const folder = getAttachmentFolder(attachmentType);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `org-${organizationId}/${folder}/${timestamp}-${random}-${sanitizedFilename}`;
}

export async function generateOrganizationUploadUrl(
  params: GenerateUploadUrlParams,
): Promise<GenerateUploadUrlResult> {
  const {
    organizationId,
    filename,
    contentType,
    sizeBytes,
    attachmentType,
    expiresIn = PRESIGNED_URL_EXPIRY_DEFAULT,
  } = params;

  const validation = validateFile(contentType, sizeBytes);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const storageKey = buildOrganizationStorageKey(organizationId, attachmentType, filename);

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const result = await generatePresignedUpload({
    filename,
    contentType,
    expiresIn,
    folder: `org-${organizationId}/${getAttachmentFolder(attachmentType)}`,
  });

  return {
    uploadUrl: result.uploadUrl,
    fileKey: result.fileKey,
    publicUrl: result.publicUrl,
    storageKey,
    expiresAt,
  };
}

export async function generateOrganizationDownloadUrl(
  params: GenerateDownloadUrlParams,
): Promise<GenerateDownloadUrlResult> {
  const { organizationId, attachmentId, expiresIn = PRESIGNED_URL_EXPIRY_DEFAULT } = params;

  const [attachment] = await db
    .select()
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        eq(ticketAttachments.organizationId, organizationId),
      ),
    );

  if (!attachment) {
    throw new Error("Attachment not found");
  }

  if (!attachment.storageKey.startsWith(`org-${organizationId}`)) {
    throw new Error("Attachment does not belong to this organization");
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const downloadUrl = await generatePresignedDownload(attachment.storageKey, expiresIn);

  return {
    downloadUrl,
    publicUrl: getPublicUrl(attachment.storageKey),
    expiresAt,
  };
}

export async function createAttachmentRecord(
  params: CreateAttachmentParams,
): Promise<AttachmentRecord> {
  const [attachment] = await db
    .insert(ticketAttachments)
    .values({
      organizationId: params.organizationId,
      ticketId: params.ticketId,
      ticketMessageId: params.ticketMessageId,
      kbArticleId: params.kbArticleId,
      contactId: params.contactId,
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageKey: params.storageKey,
      thumbnailKey: params.thumbnailKey,
      imageWidth: params.imageWidth,
      imageHeight: params.imageHeight,
      createdBy: params.createdBy,
    })
    .returning();

  return attachment as AttachmentRecord;
}

export async function getAttachmentById(
  organizationId: number,
  attachmentId: number,
): Promise<AttachmentRecord | null> {
  const [attachment] = await db
    .select()
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        eq(ticketAttachments.organizationId, organizationId),
      ),
    );

  return (attachment as AttachmentRecord) || null;
}

export async function listAttachmentsByTicket(
  organizationId: number,
  ticketId: number,
): Promise<AttachmentRecord[]> {
  return (await db
    .select()
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.ticketId, ticketId),
        eq(ticketAttachments.organizationId, organizationId),
      ),
    )
    .orderBy(desc(ticketAttachments.createdAt))) as AttachmentRecord[];
}

export async function listAttachmentsByMessage(
  organizationId: number,
  ticketMessageId: number,
): Promise<AttachmentRecord[]> {
  return (await db
    .select()
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.ticketMessageId, ticketMessageId),
        eq(ticketAttachments.organizationId, organizationId),
      ),
    )
    .orderBy(desc(ticketAttachments.createdAt))) as AttachmentRecord[];
}

export async function deleteAttachment(
  organizationId: number,
  attachmentId: number,
): Promise<boolean> {
  const attachment = await getAttachmentById(organizationId, attachmentId);

  if (!attachment) {
    return false;
  }

  if (!attachment.storageKey.startsWith(`org-${organizationId}`)) {
    throw new Error("Cannot delete attachment from another organization");
  }

  try {
    await deleteStorageFile(attachment.storageKey);
  } catch (error) {
    console.error("Failed to delete file from storage:", error);
  }

  await db.delete(ticketAttachments).where(eq(ticketAttachments.id, attachmentId));

  return true;
}

export async function scanFileForMalware(
  _fileBuffer: Buffer,
  _mimeType: string,
): Promise<{ safe: boolean; threat?: string }> {
  return { safe: true };
}
