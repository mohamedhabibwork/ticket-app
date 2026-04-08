import { db } from "@ticket-app/db";
import { ticketAttachments } from "@ticket-app/db/schema/_tickets";
import { eq, desc } from "drizzle-orm";
import { writeFile, mkdir, readFile, existsSync } from "fs/promises";
import { join, dirname } from "path";
import z from "zod";
import { publicProcedure } from "../index";
import { generateUploadUrl, generateDownloadUrl, getPublicUrl, deleteFile } from "../lib/storage";
import { env } from "@ticket-app/env/server";

export const fileRouter = {
  generateUploadUrl: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        folder: z.string().default("attachments"),
      }),
    )
    .handler(async ({ input }) => {
      const result = await generateUploadUrl({
        filename: input.filename,
        contentType: input.contentType,
        folder: input.folder,
      });

      return {
        uploadUrl: result.uploadUrl,
        fileKey: result.fileKey,
        publicUrl: result.publicUrl,
      };
    }),

  upload: publicProcedure
    .input(
      z.object({
        file: z.file(),
        fileKey: z.string(),
        filename: z.string(),
        contentType: z.string(),
        folder: z.string().default("attachments"),
        ticketId: z.number().optional(),
        ticketMessageId: z.number().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .output(
      z.object({
        id: z.number(),
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
        storageKey: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const provider = env.STORAGE_PROVIDER || "local";
      const fileBuffer = Buffer.from(await input.file.arrayBuffer());

      if (provider === "local") {
        const basePath = env.STORAGE_LOCAL_PATH || "./uploads";
        const filePath = join(basePath, input.fileKey);
        const dir = dirname(filePath);

        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(filePath, fileBuffer);
      } else {
        const url = await generateUploadUrl({
          filename: input.filename,
          contentType: input.contentType,
          folder: input.folder,
        });

        await fetch(url.uploadUrl, {
          method: "PUT",
          body: fileBuffer,
          headers: { "Content-Type": input.contentType },
        });
      }

      const [attachment] = await db
        .insert(ticketAttachments)
        .values({
          ticketId: input.ticketId,
          ticketMessageId: input.ticketMessageId,
          filename: input.filename,
          mimeType: input.contentType,
          sizeBytes: fileBuffer.length,
          storageKey: input.fileKey,
          createdBy: input.createdBy,
        })
        .returning();

      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: Number(attachment.sizeBytes),
        storageKey: attachment.storageKey,
      };
    }),

  download: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [attachment] = await db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.id, input.id));

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
        expiresIn: z.number().default(3600),
      }),
    )
    .handler(async ({ input }) => {
      const [attachment] = await db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.id, input.id));

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      const url = await generateDownloadUrl(attachment.storageKey, input.expiresIn);

      return {
        downloadUrl: url,
        publicUrl: getPublicUrl(attachment.storageKey),
        expiresIn: input.expiresIn,
      };
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [attachment] = await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.id, input.id));

    if (!attachment) {
      throw new Error("Attachment not found");
    }

    await deleteFile(attachment.storageKey);

    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, input.id));

    return { success: true };
  }),

  listByTicket: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.ticketId, input.ticketId))
        .orderBy(desc(ticketAttachments.createdAt));
    }),

  listByMessage: publicProcedure
    .input(
      z.object({
        ticketMessageId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.ticketMessageId, input.ticketMessageId))
        .orderBy(desc(ticketAttachments.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [attachment] = await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.id, input.id));
    return attachment ?? null;
  }),
};
