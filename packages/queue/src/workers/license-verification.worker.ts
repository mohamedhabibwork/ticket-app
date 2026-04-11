import { Worker, Job, Queue } from "bullmq";
import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { onPremiseLicenses } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { verifyLicenseKey } from "@ticket-app/shared/license";

const LICENSE_VERIFICATION_QUEUE = `${env.QUEUE_PREFIX}-license-verification`;

export interface LicenseVerificationJobData {
  type: "verify-license" | "verify-all";
  licenseId?: number;
}

const licenseVerificationQueue = new Queue<LicenseVerificationJobData>(LICENSE_VERIFICATION_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addLicenseVerificationJob(
  data: LicenseVerificationJobData,
  options?: { delay?: number },
): Promise<Job<LicenseVerificationJobData>> {
  return licenseVerificationQueue.add("license-verification", data, options);
}

export async function scheduleLicenseVerification(intervalHours: number = 24): Promise<void> {
  await licenseVerificationQueue.add(
    "license-verification",
    { type: "verify-all" },
    {
      repeat: { every: intervalHours * 60 * 60 * 1000 },
      jobId: "license-verification-recurring",
    },
  );
}

export function createLicenseVerificationWorker(): Worker {
  return new Worker(
    LICENSE_VERIFICATION_QUEUE,
    async (job: Job<LicenseVerificationJobData>) => {
      const { type, licenseId } = job.data;

      switch (type) {
        case "verify-license":
          if (licenseId) await verifyLicense(licenseId);
          break;
        case "verify-all":
          await verifyAllLicenses();
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );
}

async function verifyLicense(licenseId: number): Promise<void> {
  console.log(`[License-Verification] Verifying license ${licenseId}`);

  const license = await db.query.onPremiseLicenses.findFirst({
    where: eq(onPremiseLicenses.id, licenseId),
  });

  if (!license) {
    console.log(`[License-Verification] License ${licenseId} not found`);
    return;
  }

  const result = await verifyLicenseKey(license.licenseKey, "", license.signature);

  const isExpired = license.validUntil && new Date(license.validUntil) < new Date();
  const isValid = result.valid && !isExpired && license.isActive;

  await db
    .update(onPremiseLicenses)
    .set({
      isActive: isValid,
      lastVerificationAt: new Date(),
    })
    .where(eq(onPremiseLicenses.id, licenseId));

  console.log(`[License-Verification] License ${licenseId} verified: ${isValid}`);
  if (result.error) {
    console.log(`[License-Verification] Error: ${result.error}`);
  }
}

async function verifyAllLicenses(): Promise<void> {
  console.log("[License-Verification] Verifying all licenses");

  const licenses = await db.query.onPremiseLicenses.findMany({});

  let verifiedCount = 0;
  let failedCount = 0;

  for (const license of licenses) {
    const prevActive = license.isActive;
    await verifyLicense(license.id);

    if (license.isActive !== prevActive) {
      verifiedCount++;
    }
    if (!license.isActive) {
      failedCount++;
    }
  }

  console.log(
    `[License-Verification] Verified ${licenses.length} licenses. Status changed: ${verifiedCount}, Inactive: ${failedCount}`,
  );
}

export async function closeLicenseVerificationQueue(): Promise<void> {
  await licenseVerificationQueue.close();
}

export { Worker, Job, Queue };
