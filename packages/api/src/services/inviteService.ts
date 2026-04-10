import { db } from "@ticket-app/db";
import { users } from "@ticket-app/db/schema";
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
  // Check if user already exists
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

  // Create invitation record - table may need to be created

  // TODO: Create invitation record - table may need to be created

  // For now, return a mock invite object
  const invite: Invite = {
    id: Date.now(), // Temporary ID
    organizationId: params.organizationId,
    email: params.email.toLowerCase(),
    token: params.token,
    expiresAt: params.expiresAt,
    invitedBy: params.invitedBy,
    firstName: params.firstName,
    lastName: params.lastName,
    roleIds: params.roleIds,
    createdAt: new Date(),
  };

  // TODO: Insert into invitations table when schema is created
  // const [result] = await db.insert(invitations).values({
  //   organizationId: params.organizationId,
  //   email: params.email.toLowerCase(),
  //   token: params.token,
  //   expiresAt: params.expiresAt,
  //   invitedBy: params.invitedBy,
  //   firstName: params.firstName,
  //   lastName: params.lastName,
  // }).returning();

  return invite;
}
