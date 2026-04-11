import type { Context } from "@ticket-app/api/context";
import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";
import { userRoles } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";
import { getUserPermissions } from "@ticket-app/api/services/rbac";

export type PermissionCheckType = "all" | "any" | "exact";

export interface PermissionCheck {
  permission: string;
  type?: PermissionCheckType;
}

export function requirePermission(...permissions: string[]) {
  return requirePermissions(permissions, "all");
}

export function requireAnyPermission(...permissions: string[]) {
  return requirePermissions(permissions, "any");
}

export function requirePermissions(permissions: string[], type: PermissionCheckType = "all") {
  return async function permissionMiddleware(context: Context): Promise<void> {
    if (!context.auth?.userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication required",
      });
    }

    const userId = parseInt(context.auth!.userId, 10);
    const organizationId = context.auth.organizationId
      ? parseInt(context.auth.organizationId, 10)
      : context.organizationId
        ? parseInt(context.organizationId, 10)
        : null;

    if (!organizationId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Organization context is required",
      });
    }

    const userPerms = await getUserPermissions({
      userId,
      organizationId,
    });

    let hasAccess = false;

    switch (type) {
      case "any":
        hasAccess = permissions.some((p) => userPerms.includes(p));
        break;
      case "exact":
        hasAccess =
          permissions.length === 1 &&
          permissions[0] !== undefined &&
          userPerms.includes(permissions[0]);
        break;
      case "all":
      default:
        hasAccess = permissions.every((p) => userPerms.includes(p));
        break;
    }

    if (!hasAccess) {
      throw new ORPCError("FORBIDDEN", {
        message: `Insufficient permissions. Required: ${permissions.join(", ")}`,
      });
    }
  };
}

export function requirePlatformAdmin() {
  return async function platformAdminMiddleware(context: Context): Promise<void> {
    if (!context.auth?.userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication required",
      });
    }

    if (!context.session) {
      throw new ORPCError("FORBIDDEN", {
        message: "Platform admin access required",
      });
    }
  };
}

export function createPermissionMiddleware(check: PermissionCheck | PermissionCheck[]) {
  const checks = Array.isArray(check) ? check : [check];

  return async function (context: Context): Promise<void> {
    if (!context.auth?.userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication required",
      });
    }

    const userId = parseInt(context.auth!.userId, 10);
    const organizationId = context.auth.organizationId
      ? parseInt(context.auth.organizationId, 10)
      : context.organizationId
        ? parseInt(context.organizationId, 10)
        : null;

    if (!organizationId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Organization context is required",
      });
    }

    const userPerms = await getUserPermissions({
      userId,
      organizationId,
    });

    for (const c of checks) {
      const { permission, type = "exact" } = c;

      let hasAccess = false;
      switch (type) {
        case "any":
          hasAccess = permission
            .split(",")
            .map((p) => p.trim())
            .some((p) => userPerms.includes(p));
          break;
        case "all":
          hasAccess = permission
            .split(",")
            .map((p) => p.trim())
            .every((p) => userPerms.includes(p));
          break;
        case "exact":
        default:
          hasAccess = userPerms.includes(permission);
          break;
      }

      if (!hasAccess) {
        throw new ORPCError("FORBIDDEN", {
          message: `Insufficient permissions. Required: ${permission}`,
        });
      }
    }
  };
}

export function requireRole(...roleSlugs: string[]) {
  return async function roleMiddleware(context: Context): Promise<void> {
    if (!context.auth?.userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication required",
      });
    }

    const userId = parseInt(context.auth!.userId, 10);
    const organizationId = context.auth.organizationId
      ? parseInt(context.auth.organizationId, 10)
      : context.organizationId
        ? parseInt(context.organizationId, 10)
        : null;

    if (!organizationId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Organization context is required",
      });
    }

    if (!context.session) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication required",
      });
    }

    const rolesResult = await db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
      with: { role: true },
    });
    const userRoleSlugs = rolesResult
      .map((ur) => ur.role?.slug)
      .filter((slug): slug is string => !!slug);

    const hasRequiredRole = roleSlugs.some((slug) => userRoleSlugs.includes(slug));

    if (!hasRequiredRole) {
      throw new ORPCError("FORBIDDEN", {
        message: `Insufficient role. Required one of: ${roleSlugs.join(", ")}`,
      });
    }
  };
}
