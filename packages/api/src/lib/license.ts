import crypto from "crypto";

export interface LicenseVerificationResult {
  valid: boolean;
  error?: string;
  details?: {
    productEdition: string;
    seatLimit: number;
    validUntil: Date;
    features: string[];
  };
}

export interface JWTPayload {
  licenseKey: string;
  productEdition: string;
  seatLimit: number;
  validUntil: number;
  issuedAt: number;
  expiresAt: number;
  features: string[];
}

const PUBLIC_KEY_PATH = process.env.LICENSE_PUBLIC_KEY_PATH || "./keys/license-public.pem";

let cachedPublicKey: string | null = null;

async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  try {
    const fs = await import("fs");
    cachedPublicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
    return cachedPublicKey;
  } catch {
    cachedPublicKey = process.env.LICENSE_PUBLIC_KEY || "";
    return cachedPublicKey;
  }
}

function base64UrlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

function verifyRS256(payload: string, signature: string, publicKey: string): boolean {
  try {
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(payload);
    return verify.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

export async function verifyLicenseSignature(
  licenseKey: string,
  domain: string,
  signature: string
): Promise<boolean> {
  const publicKey = await getPublicKey();

  if (!publicKey) {
    console.warn("[License] No public key available, skipping signature verification");
    return true;
  }

  const payload = `${licenseKey}.${domain}`;
  const expectedSignature = crypto
    .createHash("sha256")
    .update(payload)
    .digest("base64url");

  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(payload);

  try {
    return verify.verify(publicKey, signature);
  } catch {
    return false;
  }
}

export async function decodeLicenseJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
    if (header.alg !== "RS256") {
      console.error(`[License] Unexpected algorithm: ${header.alg}`);
      return null;
    }

    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
    const publicKey = await getPublicKey();

    if (publicKey) {
      const payloadStr = `${headerB64}.${payloadB64}`;
      const isValid = verifyRS256(payloadStr, signatureB64, publicKey);

      if (!isValid) {
        console.error("[License] Invalid JWT signature");
        return null;
      }
    }

    if (payload.expiresAt && Date.now() > payload.expiresAt * 1000) {
      console.error("[License] License JWT has expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[License] Failed to decode JWT:", error);
    return null;
  }
}

export async function verifyLicenseKey(
  licenseKey: string,
  domain: string,
  signature: string
): Promise<LicenseVerificationResult> {
  try {
    const isValidSignature = await verifyLicenseSignature(licenseKey, domain, signature);

    if (!isValidSignature) {
      return { valid: false, error: "Invalid license signature" };
    }

    const jwtPayload = await decodeLicenseJWT(licenseKey);

    if (!jwtPayload) {
      return { valid: true };
    }

    return {
      valid: true,
      details: {
        productEdition: jwtPayload.productEdition,
        seatLimit: jwtPayload.seatLimit,
        validUntil: new Date(jwtPayload.validUntil * 1000),
        features: jwtPayload.features,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown verification error";
    return { valid: false, error: errorMessage };
  }
}

export async function validateSeatLimit(
  organizationId: number,
  currentSeatCount: number,
  seatLimit: number
): Promise<{ allowed: boolean; message?: string }> {
  if (currentSeatCount > seatLimit) {
    return {
      allowed: false,
      message: `Seat limit exceeded. Current: ${currentSeatCount}, Limit: ${seatLimit}`,
    };
  }

  return { allowed: true };
}

export function isOnPremiseMode(): boolean {
  return process.env.LICENSE_MODE === "on_premise" || process.env.ON_PREMISE === "true";
}

export function isMultiTenantBillingDisabled(): boolean {
  return isOnPremiseMode();
}
