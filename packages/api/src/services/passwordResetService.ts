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
  // TODO: Insert into password_resets table when schema is created
  // const [result] = await db.insert(passwordResets).values({
  //   userId: params.userId,
  //   token: params.token,
  //   expiresAt: params.expiresAt,
  //   requestedBy: params.requestedBy,
  // }).returning();

  const passwordReset: PasswordReset = {
    id: Date.now(), // Temporary ID
    userId: params.userId,
    token: params.token,
    expiresAt: params.expiresAt,
    requestedBy: params.requestedBy,
    createdAt: new Date(),
  };

  return passwordReset;
}
