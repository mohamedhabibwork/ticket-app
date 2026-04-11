import { ORPCError } from "@orpc/client";
import { db } from "@ticket-app/db";
import { users, invitations, invitationRoles } from "@ticket-app/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface CreateInviteParams {
  organizationId: number;
  email: string;
  roleIds?: number[];
  invitedBy?: number;
  token: string;
  expiresAt: Date;
  firstName?: string;
  lastName?: string;
}

export interface Invite {
  id: number;
  organizationId: number;
  email: string;
  token: string;
  expiresAt: Date;
  invitedBy?: number;
  firstName?: string;
  lastName?: string;
  roleIds?: number[];
  createdAt: Date;
}

export async function createInvite(params: CreateInviteParams): Promise<Invite> {
  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(users.email, params.email.toLowerCase()),
      eq(users.organizationId, params.organizationId),
      isNull(users.deletedAt),
    ),
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const [result] = await db
    .insert(invitations)
    .values({
      organizationId: params.organizationId,
      email: params.email.toLowerCase(),
      token: params.token,
      expiresAt: params.expiresAt,
      invitedBy: params.invitedBy ?? 0,
      firstName: params.firstName,
      lastName: params.lastName,
    })
    .returning();

  if (!result) {
    throw new ORPCError("NOT_FOUND", { message: "Failed to create invite" });
  }

  if (params.roleIds && params.roleIds.length > 0) {
    await db.insert(invitationRoles).values(
      params.roleIds.map((roleId) => ({
        invitationId: result.id,
        roleId,
      })),
    );
  }

  return {
    id: result.id,
    organizationId: result.organizationId,
    email: result.email,
    token: result.token,
    expiresAt: result.expiresAt,
    invitedBy: result.invitedBy,
    firstName: result.firstName ?? undefined,
    lastName: result.lastName ?? undefined,
    roleIds: params.roleIds,
    createdAt: result.createdAt,
  };
}
