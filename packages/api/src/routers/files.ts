import { db } from "@ticket-app/db";
import { ticketAttachments } from "@ticket-app/db/schema/_tickets";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import * as z from "zod";
import { publicProcedure } from "../index";
import { generateUploadUrl, getPublicUrl, validateFile, isImageMimeType } from "../lib/storage";
import { env } from "@ticket-app/env/server";
import {
  generateOrganizationUploadUrl,
  generateOrganizationDownloadUrl,
  createAttachmentRecord,
  getAttachmentById,
  listAttachmentsByTicket,
  listAttachmentsByMessage,
  deleteAttachment,
  type AttachmentType,
} from "../services/storage";

const THUMBNAIL_SIZE = 200;

export const fileRouter = {
  generateUploadUrl: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        filename: z.string(),
        contentType: z.string(),
        sizeBytes: z.number(),
        attachmentType: z
          .enum(["ticket", "kb_article", "contact", "avatar", "brand", "email"])
          .default("ticket"),
        ticketId: z.number().optional(),
        ticketMessageId: z.number().optional(),
        kbArticleId: z.number().optional(),
        contactId: z.number().optional(),
        expiresIn: z.number().default(3600),
      }),
    )
    .handler(async ({ input }) => {
      const result = await generateOrganizationUploadUrl({
        organizationId: input.organizationId,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        attachmentType: input.attachmentType as AttachmentType,
        ticketId: input.ticketId,
        ticketMessageId: input.ticketMessageId,
        kbArticleId: input.kbArticleId,
        contactId: input.contactId,
        expiresIn: input.expiresIn,
      });

      return {
        uploadUrl: result.uploadUrl,
        fileKey: result.fileKey,
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
        expiresAt: result.expiresAt.toISOString(),
      };
    }),

  upload: publicProcedure
    .input(
      z.object({
        file: z.file(),
        fileKey: z.string(),
        filename: z.string(),
        contentType: z.string(),
        sizeBytes: z.number(),
        organizationId: z.number(),
        ticketId: z.number().optional(),
        ticketMessageId: z.number().optional(),
        kbArticleId: z.number().optional(),
        contactId: z.number().optional(),
        createdBy: z.number().optional(),
        isInlineImage: z.boolean().default(false),
        galleryOrder: z.number().optional(),
      }),
    )
    .output(
      z.object({
        id: z.number(),
        uuid: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        storageKey: z.string(),
        thumbnailKey: z.string().optional(),
        imageWidth: z.number().optional(),
        imageHeight: z.number().optional(),
        publicUrl: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const validation = validateFile(input.contentType, input.sizeBytes);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const provider = env.STORAGE_PROVIDER || "local";
      const fileBuffer = Buffer.from(await input.file.arrayBuffer());
      const isImage = isImageMimeType(input.contentType);

      let thumbnailKey: string | undefined;
      let imageWidth: number | undefined;
      let imageHeight: number | undefined;

      if (provider === "local") {
        const basePath = env.STORAGE_LOCAL_PATH || "./uploads";
        const filePath = join(basePath, input.fileKey);
        const dir = dirname(filePath);

        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(filePath, fileBuffer);

        if (isImage) {
          try {
            const sharp = (await import("sharp")).default;
            const image = sharp(fileBuffer);
            const metadata = await image.metadata();
            imageWidth = metadata.width;
            imageHeight = metadata.height;

            const thumbnailFileName = `thumb_${input.fileKey}`;
            const thumbnailPath = join(basePath, thumbnailFileName);
            await image
              .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
              .toFile(thumbnailPath);
            thumbnailKey = thumbnailFileName;
          } catch (e) {
            console.error("Failed to generate thumbnail:", e);
          }
        }
      } else {
        if (isImage) {
          try {
            const sharp = (await import("sharp")).default;
            const image = sharp(fileBuffer);
            const metadata = await image.metadata();
            imageWidth = metadata.width;
            imageHeight = metadata.height;

            const thumbnailBuffer = await image
              .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
              .toBuffer();
            const thumbnailKeyParts = input.fileKey.split("/");
            thumbnailKeyParts[thumbnailKeyParts.length - 1] =
              `thumb_${thumbnailKeyParts[thumbnailKeyParts.length - 1]}`;
            const thumbnailFileKey = thumbnailKeyParts.join("/");

            const thumbnailResult = await generateUploadUrl({
              filename: `thumb_${input.filename}`,
              contentType: input.contentType,
              folder: input.fileKey.split("/").slice(0, -1).join("/"),
              organizationId: input.organizationId,
            });

            await fetch(thumbnailResult.uploadUrl, {
              method: "PUT",
              body: thumbnailBuffer,
              headers: { "Content-Type": input.contentType },
            });

            thumbnailKey = thumbnailFileKey;
          } catch (e) {
            console.error("Failed to generate thumbnail:", e);
          }
        }
      }

      const attachment = await createAttachmentRecord({
        organizationId: input.organizationId,
        ticketId: input.ticketId,
        ticketMessageId: input.ticketMessageId,
        kbArticleId: input.kbArticleId,
        contactId: input.contactId,
        filename: input.filename,
        mimeType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey: input.fileKey,
        thumbnailKey,
        imageWidth,
        imageHeight,
        createdBy: input.createdBy,
      });

      return {
        id: attachment.id,
        uuid: attachment.uuid,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: Number(attachment.sizeBytes),
        storageKey: attachment.storageKey,
        thumbnailKey: attachment.thumbnailKey || undefined,
        imageWidth: attachment.imageWidth || undefined,
        imageHeight: attachment.imageHeight || undefined,
        publicUrl: getPublicUrl(attachment.storageKey),
      };
    }),

  download: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const attachment = await getAttachmentById(input.organizationId, input.id);

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      const basePath = env.STORAGE_LOCAL_PATH || "./uploads";
      const filePath = join(basePath, attachment.storageKey);

      if (!existsSync(filePath)) {
        throw new Error("File not found in storage");
      }

      const fileData = await readFile(filePath);

      return {
        file: new File([fileData], attachment.filename, {
          type: attachment.mimeType,
        }),
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      };
    }),

  getDownloadUrl: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        expiresIn: z.number().default(3600),
      }),
    )
    .handler(async ({ input }) => {
      const attachment = await getAttachmentById(input.organizationId, input.id);

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      const cdnUrl = env.STORAGE_CDN_URL;
      let downloadUrl: string;
      let publicUrl: string;

      if (cdnUrl) {
        publicUrl = `${cdnUrl.replace(/\/$/, "")}/${attachment.storageKey}`;
        downloadUrl = publicUrl;
      } else {
        const result = await generateOrganizationDownloadUrl({
          organizationId: input.organizationId,
          attachmentId: input.id,
          expiresIn: input.expiresIn,
        });
        downloadUrl = result.downloadUrl;
        publicUrl = result.publicUrl;
      }

      return {
        downloadUrl,
        publicUrl,
        expiresIn: input.expiresIn,
      };
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const deleted = await deleteAttachment(input.organizationId, input.id);

      if (!deleted) {
        throw new Error("Attachment not found");
      }

      return { success: true };
    }),

  listByTicket: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ticketId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await listAttachmentsByTicket(input.organizationId, input.ticketId);
    }),

  listByMessage: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ticketMessageId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await listAttachmentsByMessage(input.organizationId, input.ticketMessageId);
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await getAttachmentById(input.organizationId, input.id);
    }),

  getGallery: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ticketId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return db
        .select()
        .from(ticketAttachments)
        .where(
          and(
            eq(ticketAttachments.ticketId, input.ticketId),
            eq(ticketAttachments.organizationId, input.organizationId),
          ),
        )
        .orderBy(ticketAttachments.galleryOrder);
    }),

  updateGalleryOrder: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        galleryOrder: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const attachment = await getAttachmentById(input.organizationId, input.id);

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      const [updated] = await db
        .update(ticketAttachments)
        .set({ galleryOrder: input.galleryOrder })
        .where(eq(ticketAttachments.id, input.id))
        .returning();

      return updated;
    }),
};
