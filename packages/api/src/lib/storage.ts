import { env } from "@ticket-app/env/server";

const S3_ENDPOINT = env.S3_ENDPOINT || "https://s3.amazonaws.com";
const S3_REGION = env.S3_REGION || "us-east-1";
const S3_BUCKET = env.S3_BUCKET || "ticket-app-uploads";

interface PresignedUrlOptions {
  filename: string;
  contentType: string;
  expiresIn?: number;
  folder?: string;
}

interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

function generateFileKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${folder}/${timestamp}-${random}-${sanitizedFilename}`;
}

async function generatePresignedUrl(
  method: "PUT" | "GET",
  fileKey: string,
  expiresIn: number,
  contentType?: string,
): Promise<string> {
  const host = S3_ENDPOINT.replace("https://", "").replace("http://", "");

  const url = new URL(`${S3_ENDPOINT}/${S3_BUCKET}/${fileKey}`);
  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set("X-Amz-Expires", expiresIn.toString());
  url.searchParams.set("X-Amz-Date", new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z");

  return url.toString();
}

export async function generateUploadUrl(
  options: PresignedUrlOptions,
): Promise<PresignedUploadResult> {
  const { filename, contentType, expiresIn = 3600, folder = "uploads" } = options;

  const fileKey = generateFileKey(folder, filename);
  const uploadUrl = await generatePresignedUrl("PUT", fileKey, expiresIn, contentType);
  const publicUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${fileKey}`;

  return {
    uploadUrl,
    fileKey,
    publicUrl,
  };
}

export async function generateDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600,
): Promise<string> {
  return generatePresignedUrl("GET", fileKey, expiresIn);
}

export function getPublicUrl(fileKey: string): string {
  return `${S3_ENDPOINT}/${S3_BUCKET}/${fileKey}`;
}

export async function deleteFile(fileKey: string): Promise<void> {
  const url = `${S3_ENDPOINT}/${S3_BUCKET}/${fileKey}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}
