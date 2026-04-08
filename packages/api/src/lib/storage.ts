import { env } from "@ticket-app/env/server";
import { createHmac } from "crypto";
import { join } from "path";
import { writeFile, mkdir, unlink, stat, readFile } from "fs/promises";
import { existsSync } from "fs";

export type StorageProvider = "s3" | "minio" | "local" | "oracle";

export interface PresignedUrlOptions {
  filename: string;
  contentType: string;
  expiresIn?: number;
  folder?: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export interface StorageDriver {
  generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult>;
  generateDownloadUrl(fileKey: string, expiresIn?: number): Promise<string>;
  getPublicUrl(fileKey: string): string;
  deleteFile(fileKey: string): Promise<void>;
}

function generateFileKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${folder}/${timestamp}-${random}-${sanitizedFilename}`;
}

function getS3Config() {
  const endpoint = env.STORAGE_ENDPOINT || "https://s3.amazonaws.com";
  const region = env.STORAGE_REGION || "us-east-1";
  const bucket = env.STORAGE_BUCKET || "ticket-app-uploads";
  const accessKey = env.STORAGE_ACCESS_KEY;
  const secretKey = env.STORAGE_SECRET_KEY;
  const publicUrl = env.STORAGE_PUBLIC_URL;

  return { endpoint, region, bucket, accessKey, secretKey, publicUrl };
}

async function generateAWSV4Signature(
  secretKey: string,
  date: string,
  region: string,
  service: string,
  method: string,
  path: string,
  headers: Record<string, string>,
): Promise<string> {
  const dateKey = createHmac("sha256", `AWS4${secretKey}`).update(date).digest("hex");
  const regionKey = createHmac("sha256", dateKey).update(region).digest("hex");
  const serviceKey = createHmac("sha256", regionKey).update(service).digest("hex");
  const signingKey = createHmac("sha256", serviceKey).update("aws4_request").digest("hex");

  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join("\n");

  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    "",
    canonicalHeaders,
    "",
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    credentialScope,
    createHmac("sha256", "").update(canonicalRequest).digest("hex"),
  ].join("\n");

  return createHmac("sha256", signingKey).update(stringToSign).digest("hex");
}

class S3StorageDriver implements StorageDriver {
  private endpoint: string;
  private region: string;
  private bucket: string;
  private accessKey?: string;
  private secretKey?: string;
  private publicUrl?: string;
  private service = "s3";

  constructor() {
    const config = getS3Config();
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.bucket = config.bucket;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.publicUrl = config.publicUrl;
  }

  async generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult> {
    const { filename, contentType, expiresIn = 3600, folder = "uploads" } = options;
    const fileKey = generateFileKey(folder, filename);
    const uploadUrl = await this.createPresignedUrl("PUT", fileKey, expiresIn, contentType);
    const publicUrl = this.getPublicUrl(fileKey);

    return { uploadUrl, fileKey, publicUrl };
  }

  async generateDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    return this.createPresignedUrl("GET", fileKey, expiresIn);
  }

  getPublicUrl(fileKey: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, "")}/${fileKey}`;
    }
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.createPresignedUrl("DELETE", fileKey, 3600);
    const url = `${this.endpoint}/${this.bucket}/${fileKey}`;
    await fetch(url, { method: "DELETE" });
  }

  private async createPresignedUrl(
    method: "PUT" | "GET" | "DELETE",
    fileKey: string,
    expiresIn: number,
    contentType?: string,
  ): Promise<string> {
    const host = this.endpoint.replace("https://", "").replace("http://", "");
    const path = `/${this.bucket}/${fileKey}`;
    const date = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateShort = date.slice(0, 8);

    const headers: Record<string, string> = {
      host: `${host}${path}`,
      "x-amz-date": date,
      "x-amz-expires": expiresIn.toString(),
    };

    if (contentType && method === "PUT") {
      headers["content-type"] = contentType;
    }

    const url = new URL(`${this.endpoint}${path}`);
    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    url.searchParams.set("X-Amz-Expires", expiresIn.toString());
    url.searchParams.set("X-Amz-Date", date);

    if (this.accessKey && this.secretKey) {
      const credential = `${this.accessKey}/${dateShort}/${this.region}/${this.service}/aws4_request`;
      url.searchParams.set("X-Amz-Credential", credential);

      const signature = await generateAWSV4Signature(
        this.secretKey,
        dateShort,
        this.region,
        this.service,
        method,
        path,
        headers,
      );
      url.searchParams.set("X-Amz-Signature", signature);
      url.searchParams.set("X-Amz-SignedHeaders", Object.keys(headers).map((k) => k.toLowerCase()).join(";"));
    }

    return url.toString();
  }
}

class MinIOStorageDriver implements StorageDriver {
  private endpoint: string;
  private region: string;
  private bucket: string;
  private accessKey?: string;
  private secretKey?: string;
  private publicUrl?: string;
  private service = "s3";

  constructor() {
    const config = getS3Config();
    this.endpoint = config.endpoint || "http://localhost:9000";
    this.region = config.region;
    this.bucket = config.bucket;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.publicUrl = config.publicUrl;
  }

  async generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult> {
    const { filename, contentType, expiresIn = 3600, folder = "uploads" } = options;
    const fileKey = generateFileKey(folder, filename);
    const uploadUrl = await this.createPresignedUrl("PUT", fileKey, expiresIn, contentType);
    const publicUrl = this.getPublicUrl(fileKey);

    return { uploadUrl, fileKey, publicUrl };
  }

  async generateDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    return this.createPresignedUrl("GET", fileKey, expiresIn);
  }

  getPublicUrl(fileKey: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, "")}/${fileKey}`;
    }
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.createPresignedUrl("DELETE", fileKey, 3600);
    const url = `${this.endpoint}/${this.bucket}/${fileKey}`;
    await fetch(url, { method: "DELETE" });
  }

  private async createPresignedUrl(
    method: "PUT" | "GET" | "DELETE",
    fileKey: string,
    expiresIn: number,
    contentType?: string,
  ): Promise<string> {
    const host = this.endpoint.replace("https://", "").replace("http://", "");
    const path = `/${this.bucket}/${fileKey}`;
    const date = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateShort = date.slice(0, 8);

    const headers: Record<string, string> = {
      host: `${host}${path}`,
      "x-amz-date": date,
      "x-amz-expires": expiresIn.toString(),
    };

    if (contentType && method === "PUT") {
      headers["content-type"] = contentType;
    }

    const url = new URL(`${this.endpoint}${path}`);
    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    url.searchParams.set("X-Amz-Expires", expiresIn.toString());
    url.searchParams.set("X-Amz-Date", date);

    if (this.accessKey && this.secretKey) {
      const credential = `${this.accessKey}/${dateShort}/${this.region}/${this.service}/aws4_request`;
      url.searchParams.set("X-Amz-Credential", credential);

      const signature = await generateAWSV4Signature(
        this.secretKey,
        dateShort,
        this.region,
        this.service,
        method,
        path,
        headers,
      );
      url.searchParams.set("X-Amz-Signature", signature);
      url.searchParams.set("X-Amz-SignedHeaders", Object.keys(headers).map((k) => k.toLowerCase()).join(";"));
    }

    return url.toString();
  }
}

class LocalStorageDriver implements StorageDriver {
  private basePath: string;
  private publicUrl: string;

  constructor() {
    this.basePath = env.STORAGE_LOCAL_PATH || "./uploads";
    this.publicUrl = env.STORAGE_PUBLIC_URL || "/uploads";
  }

  async generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult> {
    const { filename, folder = "uploads" } = options;
    const fileKey = generateFileKey(folder, filename);
    const publicUrl = this.getPublicUrl(fileKey);

    const uploadUrl = `/api/storage/upload?key=${encodeURIComponent(fileKey)}`;

    return { uploadUrl, fileKey, publicUrl };
  }

  async generateDownloadUrl(fileKey: string, _expiresIn: number = 3600): Promise<string> {
    return this.getPublicUrl(fileKey);
  }

  getPublicUrl(fileKey: string): string {
    return `${this.publicUrl.replace(/\/$/, "")}/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    const filePath = join(this.basePath, fileKey);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  async writeFile(fileKey: string, data: Buffer): Promise<void> {
    const filePath = join(this.basePath, fileKey);
    const dir = join(this.basePath, fileKey.split("/").slice(0, -1).join("/"));
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, data);
  }

  async readFile(fileKey: string): Promise<Buffer | null> {
    const filePath = join(this.basePath, fileKey);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFile(filePath);
  }

  async getFileSize(fileKey: string): Promise<number | null> {
    const filePath = join(this.basePath, fileKey);
    if (!existsSync(filePath)) {
      return null;
    }
    const stats = await stat(filePath);
    return stats.size;
  }
}

class OracleStorageDriver implements StorageDriver {
  private namespace: string;
  private bucket: string;
  private region: string;
  private accessKey?: string;
  private secretKey?: string;
  private endpoint: string;
  private publicUrl?: string;

  constructor() {
    this.namespace = env.STORAGE_ENDPOINT || "";
    this.bucket = env.STORAGE_BUCKET || "ticket-app-uploads";
    this.region = env.STORAGE_REGION || "us-phoenix-1";
    this.accessKey = env.STORAGE_ACCESS_KEY;
    this.secretKey = env.STORAGE_SECRET_KEY;
    this.endpoint = `https://objectstorage.${this.region}.oraclecloud.com`;
    this.publicUrl = env.STORAGE_PUBLIC_URL;
  }

  async generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult> {
    const { filename, contentType, expiresIn = 3600, folder = "uploads" } = options;
    const fileKey = generateFileKey(folder, filename);
    const uploadUrl = await this.createPresignedUrl("PUT", fileKey, expiresIn, contentType);
    const publicUrl = this.getPublicUrl(fileKey);

    return { uploadUrl, fileKey, publicUrl };
  }

  async generateDownloadUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    return this.createPresignedUrl("GET", fileKey, expiresIn);
  }

  getPublicUrl(fileKey: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, "")}/${fileKey}`;
    }
    return `${this.endpoint}/n/${this.namespace}/b/${this.bucket}/o/${fileKey}`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    const url = `${this.endpoint}/n/${this.namespace}/b/${this.bucket}/o/${fileKey}`;
    await fetch(url, { method: "DELETE" });
  }

  private async createPresignedUrl(
    method: "PUT" | "GET" | "DELETE",
    fileKey: string,
    expiresIn: number,
    contentType?: string,
  ): Promise<string> {
    const path = `/n/${this.namespace}/b/${this.bucket}/o/${fileKey}`;
    const date = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateShort = date.slice(0, 8);

    const headers: Record<string, string> = {
      host: `objectstorage.${this.region}.oraclecloud.com`,
      "x-api-date": date,
      "x-signature-version": "1",
    };

    if (contentType && method === "PUT") {
      headers["content-type"] = contentType;
    }

    const url = new URL(`${this.endpoint}${path}`);
    url.searchParams.set("expires", expiresIn.toString());
    url.searchParams.set("date", date);

    if (this.accessKey && this.secretKey) {
      const signature = await generateAWSV4Signature(
        this.secretKey,
        dateShort,
        this.region,
        "objectstorage",
        method,
        path,
        headers,
      );
      url.searchParams.set("signature", signature);
    }

    return url.toString();
  }
}

let storageDriver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (storageDriver) {
    return storageDriver;
  }

  const provider = env.STORAGE_PROVIDER || "s3";

  switch (provider) {
    case "s3":
      storageDriver = new S3StorageDriver();
      break;
    case "minio":
      storageDriver = new MinIOStorageDriver();
      break;
    case "local":
      storageDriver = new LocalStorageDriver();
      break;
    case "oracle":
      storageDriver = new OracleStorageDriver();
      break;
    default:
      storageDriver = new S3StorageDriver();
  }

  return storageDriver;
}

export async function generateUploadUrl(options: PresignedUrlOptions): Promise<PresignedUploadResult> {
  return getStorageDriver().generateUploadUrl(options);
}

export async function generateDownloadUrl(fileKey: string, expiresIn?: number): Promise<string> {
  return getStorageDriver().generateDownloadUrl(fileKey, expiresIn);
}

export function getPublicUrl(fileKey: string): string {
  return getStorageDriver().getPublicUrl(fileKey);
}

export async function deleteFile(fileKey: string): Promise<void> {
  return getStorageDriver().deleteFile(fileKey);
}

export { LocalStorageDriver };