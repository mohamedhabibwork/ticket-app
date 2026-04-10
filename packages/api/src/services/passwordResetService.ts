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

  return {
    id: result.id,
    userId: result.userId,
    token: result.token,
    expiresAt: result.expiresAt,
    requestedBy: result.requestedBy ?? undefined,
    createdAt: result.createdAt,
  };
}
