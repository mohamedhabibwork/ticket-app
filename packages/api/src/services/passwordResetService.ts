import { db } from "@ticket-app/db";
import { passwordResets } from "@ticket-app/db/schema";

export interface CreatePasswordResetParams {
  userId: number;
  token: string;
  expiresAt: Date;
  requestedBy?: number;
}

export interface PasswordReset {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  requestedBy?: number;
  createdAt: Date;
}

export async function createPasswordReset(
  params: CreatePasswordResetParams,
): Promise<PasswordReset> {
  const [result] = await db
    .insert(passwordResets)
    .values({
      userId: params.userId,
      token: params.token,
      expiresAt: params.expiresAt,
      requestedBy: params.requestedBy,
    })
    .returning();

  if (!result) {
    throw new Error("Failed to create password reset token");
  }
  const resultData = result!;

  return {
    id: resultData.id,
    userId: resultData.userId,
    token: resultData.token,
    expiresAt: resultData.expiresAt,
    requestedBy: resultData.requestedBy ?? undefined,
    createdAt: resultData.createdAt,
  };
}
