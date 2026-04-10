import { db } from "@ticket-app/db";
import { auditLogs } from "@ticket-app/db/schema";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "2FA_ENABLE"
  | "2FA_DISABLE"
  | "API_KEY_CREATE"
  | "API_KEY_REVOKE"
  | "BILLING_CHANGE"
  | "PLAN_CHANGE"
  | "SEAT_ADD"
  | "SEAT_REMOVE"
  | "DOMAIN_VERIFY"
  | "EXPORT_DATA"
  | "IMPORT_DATA";

export interface AuditContext {
  userId?: number;
  organizationId?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditEntry {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(context: AuditContext, entry: AuditEntry): Promise<void> {
  try {
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        userId: context.userId ? Number(context.userId) : null,
        organizationId: context.organizationId ? Number(context.organizationId) : null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      })
      .returning();

    console.info("Audit log created", {
      auditId: auditLog?.id,
      action: entry.action,
      resourceType: entry.resourceType,
    });
  } catch (error) {
    console.error("Failed to create audit log", { error, entry });
  }
}

export function trackChanges<T extends Record<string, unknown>>(
  oldValues: T,
  newValues: Partial<T>,
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newValues) as (keyof T)[]) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];

    if (oldVal !== newVal) {
      changes[key as string] = { old: oldVal, new: newVal };
    }
  }

  return changes;
}
