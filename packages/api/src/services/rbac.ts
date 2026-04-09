import { eq, and, isNull } from "drizzle-orm";
import { db } from "@ticket-app/db";
import {
  permissions,
  roles,
  rolePermissions,
  userRoles,
  teams,
  teamMembers,
  groups,
} from "@ticket-app/db/schema";
import { createAuditLog, trackChanges } from "./audit";

export const PERMISSION_GROUPS = {
  TICKETS: "tickets",
  CONTACTS: "contacts",
  USERS: "users",
  ROLES: "roles",
  TEAMS: "teams",
  GROUPS: "groups",
  REPORTS: "reports",
  SETTINGS: "settings",
  BILLING: "billing",
  KNOWLEDGEBASE: "knowledgebase",
  FORMS: "forms",
  WORKFLOWS: "workflows",
  MAILBOXES: "mailboxes",
  ANALYTICS: "analytics",
  API_KEYS: "api_keys",
  AUDIT: "audit",
  GDPR: "gdpr",
  CHATBOT: "chatbot",
  MOBILE_SDK: "mobile_sdk",
  TICKET_CATEGORIES: "ticket_categories",
  TICKET_FORWARDS: "ticket_forwards",
  DISQUS: "disqus",
  MARKETPLACE: "marketplace",
  CALENDAR: "calendar",
  TRANSLATION: "translation",
  ON_PREMISE: "on_premise",
  PRESENCE: "presence",
} as const;

export const PERMISSION_ACTIONS = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

export function buildPermissionKey(group: string, action: string): string {
  return `${group}.${action}`;
}

export const DEFAULT_PERMISSIONS: Array<{ key: string; label: string; group: string }> = [
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKETS, PERMISSION_ACTIONS.READ),
    label: "View Tickets",
    group: PERMISSION_GROUPS.TICKETS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKETS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Tickets",
    group: PERMISSION_GROUPS.TICKETS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKETS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Tickets",
    group: PERMISSION_GROUPS.TICKETS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKETS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Tickets",
    group: PERMISSION_GROUPS.TICKETS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CONTACTS, PERMISSION_ACTIONS.READ),
    label: "View Contacts",
    group: PERMISSION_GROUPS.CONTACTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CONTACTS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Contacts",
    group: PERMISSION_GROUPS.CONTACTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CONTACTS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Contacts",
    group: PERMISSION_GROUPS.CONTACTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CONTACTS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Contacts",
    group: PERMISSION_GROUPS.CONTACTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.READ),
    label: "View Users",
    group: PERMISSION_GROUPS.USERS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Users",
    group: PERMISSION_GROUPS.USERS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Users",
    group: PERMISSION_GROUPS.USERS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.USERS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Users",
    group: PERMISSION_GROUPS.USERS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ROLES, PERMISSION_ACTIONS.READ),
    label: "View Roles",
    group: PERMISSION_GROUPS.ROLES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ROLES, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Roles",
    group: PERMISSION_GROUPS.ROLES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ROLES, PERMISSION_ACTIONS.DELETE),
    label: "Delete Roles",
    group: PERMISSION_GROUPS.ROLES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ROLES, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Roles",
    group: PERMISSION_GROUPS.ROLES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TEAMS, PERMISSION_ACTIONS.READ),
    label: "View Teams",
    group: PERMISSION_GROUPS.TEAMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TEAMS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Teams",
    group: PERMISSION_GROUPS.TEAMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TEAMS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Teams",
    group: PERMISSION_GROUPS.TEAMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TEAMS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Teams",
    group: PERMISSION_GROUPS.TEAMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.READ),
    label: "View Groups",
    group: PERMISSION_GROUPS.GROUPS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Groups",
    group: PERMISSION_GROUPS.GROUPS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Groups",
    group: PERMISSION_GROUPS.GROUPS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Groups",
    group: PERMISSION_GROUPS.GROUPS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.REPORTS, PERMISSION_ACTIONS.READ),
    label: "View Reports",
    group: PERMISSION_GROUPS.REPORTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.REPORTS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Reports",
    group: PERMISSION_GROUPS.REPORTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.REPORTS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Reports",
    group: PERMISSION_GROUPS.REPORTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.REPORTS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Reports",
    group: PERMISSION_GROUPS.REPORTS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.SETTINGS, PERMISSION_ACTIONS.READ),
    label: "View Settings",
    group: PERMISSION_GROUPS.SETTINGS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.SETTINGS, PERMISSION_ACTIONS.WRITE),
    label: "Edit Settings",
    group: PERMISSION_GROUPS.SETTINGS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.SETTINGS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Settings",
    group: PERMISSION_GROUPS.SETTINGS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.BILLING, PERMISSION_ACTIONS.READ),
    label: "View Billing",
    group: PERMISSION_GROUPS.BILLING,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.BILLING, PERMISSION_ACTIONS.WRITE),
    label: "Manage Billing",
    group: PERMISSION_GROUPS.BILLING,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.KNOWLEDGEBASE, PERMISSION_ACTIONS.READ),
    label: "View Knowledgebase",
    group: PERMISSION_GROUPS.KNOWLEDGEBASE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.KNOWLEDGEBASE, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Knowledgebase",
    group: PERMISSION_GROUPS.KNOWLEDGEBASE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.KNOWLEDGEBASE, PERMISSION_ACTIONS.DELETE),
    label: "Delete Knowledgebase",
    group: PERMISSION_GROUPS.KNOWLEDGEBASE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.KNOWLEDGEBASE, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Knowledgebase",
    group: PERMISSION_GROUPS.KNOWLEDGEBASE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.FORMS, PERMISSION_ACTIONS.READ),
    label: "View Forms",
    group: PERMISSION_GROUPS.FORMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.FORMS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Forms",
    group: PERMISSION_GROUPS.FORMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.FORMS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Forms",
    group: PERMISSION_GROUPS.FORMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.FORMS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Forms",
    group: PERMISSION_GROUPS.FORMS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.WORKFLOWS, PERMISSION_ACTIONS.READ),
    label: "View Workflows",
    group: PERMISSION_GROUPS.WORKFLOWS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.WORKFLOWS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Workflows",
    group: PERMISSION_GROUPS.WORKFLOWS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.WORKFLOWS, PERMISSION_ACTIONS.DELETE),
    label: "Delete Workflows",
    group: PERMISSION_GROUPS.WORKFLOWS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.WORKFLOWS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Workflows",
    group: PERMISSION_GROUPS.WORKFLOWS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MAILBOXES, PERMISSION_ACTIONS.READ),
    label: "View Mailboxes",
    group: PERMISSION_GROUPS.MAILBOXES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MAILBOXES, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit Mailboxes",
    group: PERMISSION_GROUPS.MAILBOXES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MAILBOXES, PERMISSION_ACTIONS.DELETE),
    label: "Delete Mailboxes",
    group: PERMISSION_GROUPS.MAILBOXES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MAILBOXES, PERMISSION_ACTIONS.MANAGE),
    label: "Manage Mailboxes",
    group: PERMISSION_GROUPS.MAILBOXES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ANALYTICS, PERMISSION_ACTIONS.READ),
    label: "View Analytics",
    group: PERMISSION_GROUPS.ANALYTICS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.API_KEYS, PERMISSION_ACTIONS.READ),
    label: "View API Keys",
    group: PERMISSION_GROUPS.API_KEYS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.API_KEYS, PERMISSION_ACTIONS.WRITE),
    label: "Create/Edit API Keys",
    group: PERMISSION_GROUPS.API_KEYS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.API_KEYS, PERMISSION_ACTIONS.DELETE),
    label: "Delete API Keys",
    group: PERMISSION_GROUPS.API_KEYS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.API_KEYS, PERMISSION_ACTIONS.MANAGE),
    label: "Manage API Keys",
    group: PERMISSION_GROUPS.API_KEYS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.AUDIT, PERMISSION_ACTIONS.READ),
    label: "View Audit Logs",
    group: PERMISSION_GROUPS.AUDIT,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GDPR, PERMISSION_ACTIONS.READ),
    label: "View GDPR Requests",
    group: PERMISSION_GROUPS.GDPR,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.GDPR, PERMISSION_ACTIONS.WRITE),
    label: "Manage GDPR Requests",
    group: PERMISSION_GROUPS.GDPR,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
    label: "View Chatbot Configurations",
    group: PERMISSION_GROUPS.CHATBOT,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
    label: "Manage Chatbot Configurations",
    group: PERMISSION_GROUPS.CHATBOT,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.READ),
    label: "View Mobile SDK Configurations",
    group: PERMISSION_GROUPS.MOBILE_SDK,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MOBILE_SDK, PERMISSION_ACTIONS.WRITE),
    label: "Manage Mobile SDK Configurations",
    group: PERMISSION_GROUPS.MOBILE_SDK,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.READ),
    label: "View Ticket Categories",
    group: PERMISSION_GROUPS.TICKET_CATEGORIES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.WRITE),
    label: "Manage Ticket Categories",
    group: PERMISSION_GROUPS.TICKET_CATEGORIES,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKET_FORWARDS, PERMISSION_ACTIONS.READ),
    label: "View Ticket Forwards",
    group: PERMISSION_GROUPS.TICKET_FORWARDS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TICKET_FORWARDS, PERMISSION_ACTIONS.WRITE),
    label: "Create Ticket Forwards",
    group: PERMISSION_GROUPS.TICKET_FORWARDS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.READ),
    label: "View Disqus Accounts",
    group: PERMISSION_GROUPS.DISQUS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.DISQUS, PERMISSION_ACTIONS.WRITE),
    label: "Manage Disqus Accounts",
    group: PERMISSION_GROUPS.DISQUS,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.READ),
    label: "View Marketplace Accounts",
    group: PERMISSION_GROUPS.MARKETPLACE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.MARKETPLACE, PERMISSION_ACTIONS.WRITE),
    label: "Manage Marketplace Accounts",
    group: PERMISSION_GROUPS.MARKETPLACE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.READ),
    label: "View Calendar Connections",
    group: PERMISSION_GROUPS.CALENDAR,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.CALENDAR, PERMISSION_ACTIONS.WRITE),
    label: "Manage Calendar Connections",
    group: PERMISSION_GROUPS.CALENDAR,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.READ),
    label: "View Translation Configurations",
    group: PERMISSION_GROUPS.TRANSLATION,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.TRANSLATION, PERMISSION_ACTIONS.WRITE),
    label: "Manage Translation Configurations",
    group: PERMISSION_GROUPS.TRANSLATION,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.READ),
    label: "View On-Premise Licenses",
    group: PERMISSION_GROUPS.ON_PREMISE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.ON_PREMISE, PERMISSION_ACTIONS.WRITE),
    label: "Manage On-Premise Licenses",
    group: PERMISSION_GROUPS.ON_PREMISE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.READ),
    label: "View Ticket Presence",
    group: PERMISSION_GROUPS.PRESENCE,
  },
  {
    key: buildPermissionKey(PERMISSION_GROUPS.PRESENCE, PERMISSION_ACTIONS.WRITE),
    label: "Manage Ticket Presence",
    group: PERMISSION_GROUPS.PRESENCE,
  },
];

export const SYSTEM_ROLE_SLUGS = {
  OWNER: "owner",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  AGENT: "agent",
  VIEWER: "viewer",
} as const;

export interface UserPermissionContext {
  userId: number;
  organizationId: number;
  isPlatformAdmin?: boolean;
}

export async function getUserPermissions(ctx: UserPermissionContext): Promise<string[]> {
  if (ctx.isPlatformAdmin) {
    const allPerms = await db.query.permissions.findMany();
    return allPerms.map((p) => p.key);
  }

  const userRoleRows = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, ctx.userId),
    with: {
      role: {
        with: {
          permissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissionKeys = new Set<string>();
  for (const ur of userRoleRows) {
    if (ur.role.isActive && !ur.role.deletedAt) {
      for (const rp of ur.role.permissions) {
        permissionKeys.add(rp.permission.key);
      }
    }
  }

  return Array.from(permissionKeys);
}

export async function hasPermission(
  ctx: UserPermissionContext,
  permission: string,
): Promise<boolean> {
  const userPerms = await getUserPermissions(ctx);
  return userPerms.includes(permission);
}

export async function hasAnyPermission(
  ctx: UserPermissionContext,
  permissions: string[],
): Promise<boolean> {
  const userPerms = await getUserPermissions(ctx);
  return permissions.some((p) => userPerms.includes(p));
}

export async function hasAllPermissions(
  ctx: UserPermissionContext,
  permissions: string[],
): Promise<boolean> {
  const userPerms = await getUserPermissions(ctx);
  return permissions.every((p) => userPerms.includes(p));
}

export async function getRoleWithPermissions(roleId: number) {
  return db.query.roles.findFirst({
    where: eq(roles.id, roleId),
    with: {
      permissions: {
        with: {
          permission: true,
        },
      },
      userRoles: true,
    },
  });
}

export async function createRole(params: {
  organizationId: number;
  name: string;
  slug: string;
  description?: string;
  ticketViewScope?: "all" | "group" | "self";
  permissionIds?: number[];
  createdBy: number;
}) {
  const [role] = await db
    .insert(roles)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      ticketViewScope: params.ticketViewScope || "all",
      isSystem: false,
      createdBy: params.createdBy,
    })
    .returning();

  if (params.permissionIds?.length) {
    await db.insert(rolePermissions).values(
      params.permissionIds.map((pid) => ({
        roleId: role.id,
        permissionId: pid,
        createdBy: params.createdBy,
      })),
    );
  }

  return role;
}

export async function updateRolePermissions(params: {
  roleId: number;
  permissionIds: number[];
  updatedBy: number;
  auditContext?: {
    userId?: number;
    organizationId?: number;
    ipAddress?: string;
    userAgent?: string;
  };
}) {
  const existingRole = await getRoleWithPermissions(params.roleId);
  if (!existingRole) {
    throw new Error("Role not found");
  }

  if (existingRole.isSystem) {
    throw new Error("Cannot modify system role permissions");
  }

  const oldPermissionIds = existingRole.permissions.map((p) => p.permission.id).sort();

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, params.roleId));

  if (params.permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      params.permissionIds.map((pid) => ({
        roleId: params.roleId,
        permissionId: pid,
        createdBy: params.updatedBy,
      })),
    );
  }

  if (params.auditContext) {
    const newPermissionIds = params.permissionIds.sort();
    const changes = trackChanges(
      { permissions: oldPermissionIds },
      { permissions: newPermissionIds },
    );

    await createAuditLog(
      {
        userId: params.auditContext.userId,
        organizationId: params.auditContext.organizationId,
        ipAddress: params.auditContext.ipAddress,
        userAgent: params.auditContext.userAgent,
      },
      {
        action: "ROLE_PERMISSION_UPDATE",
        resourceType: "role",
        resourceId: params.roleId.toString(),
        changes,
      },
    );
  }

  return getRoleWithPermissions(params.roleId);
}

export async function deleteRole(params: {
  roleId: number;
  auditContext?: {
    userId?: number;
    organizationId?: number;
    ipAddress?: string;
    userAgent?: string;
  };
}) {
  const role = await db.query.roles.findFirst({
    where: eq(roles.id, params.roleId),
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isSystem) {
    throw new Error("Cannot delete system role");
  }

  const userCount = await db.query.userRoles.count({
    where: eq(userRoles.roleId, params.roleId),
  });

  if (userCount > 0) {
    throw new Error("Cannot delete role with assigned users");
  }

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, params.roleId));

  await db
    .update(roles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(roles.id, params.roleId));

  if (params.auditContext) {
    await createAuditLog(
      {
        userId: params.auditContext.userId,
        organizationId: params.auditContext.organizationId,
        ipAddress: params.auditContext.ipAddress,
        userAgent: params.auditContext.userAgent,
      },
      {
        action: "DELETE",
        resourceType: "role",
        resourceId: params.roleId.toString(),
      },
    );
  }

  return { success: true };
}

export async function seedDefaultPermissions() {
  const existing = await db.query.permissions.findMany();
  if (existing.length > 0) {
    return;
  }

  await db.insert(permissions).values(
    DEFAULT_PERMISSIONS.map((p) => ({
      key: p.key,
      label: p.label,
      group: p.group,
    })),
  );
}

export async function seedSystemRoles(organizationId: number) {
  const allPerms = await db.query.permissions.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  const ownerPermIds = allPerms.map((p) => p.id);
  const adminPermIds = allPerms
    .filter((p) => p.group !== PERMISSION_GROUPS.AUDIT || p.key.includes("read"))
    .map((p) => p.id);
  const supervisorPermIds = allPerms
    .filter(
      (p) =>
        p.group === PERMISSION_GROUPS.TICKETS ||
        p.group === PERMISSION_GROUPS.CONTACTS ||
        p.group === PERMISSION_GROUPS.TEAMS ||
        p.group === PERMISSION_GROUPS.REPORTS ||
        p.group === PERMISSION_GROUPS.KNOWLEDGEBASE,
    )
    .map((p) => p.id);
  const agentPermIds = allPerms
    .filter(
      (p) =>
        (p.group === PERMISSION_GROUPS.TICKETS &&
          (p.key.includes("read") || p.key.includes("write"))) ||
        p.group === PERMISSION_GROUPS.CONTACTS ||
        p.group === PERMISSION_GROUPS.KNOWLEDGEBASE,
    )
    .map((p) => p.id);
  const viewerPermIds = allPerms.filter((p) => p.key.includes("read")).map((p) => p.id);

  const systemRoles = [
    {
      name: "Owner",
      slug: SYSTEM_ROLE_SLUGS.OWNER,
      description: "Full access to all features",
      permissionIds: ownerPermIds,
    },
    {
      name: "Administrator",
      slug: SYSTEM_ROLE_SLUGS.ADMIN,
      description: "Administrative access",
      permissionIds: adminPermIds,
    },
    {
      name: "Supervisor",
      slug: SYSTEM_ROLE_SLUGS.SUPERVISOR,
      description: "Supervisory access to tickets and teams",
      permissionIds: supervisorPermIds,
    },
    {
      name: "Agent",
      slug: SYSTEM_ROLE_SLUGS.AGENT,
      description: "Support agent access",
      permissionIds: agentPermIds,
    },
    {
      name: "Viewer",
      slug: SYSTEM_ROLE_SLUGS.VIEWER,
      description: "Read-only access",
      permissionIds: viewerPermIds,
    },
  ];

  for (const sr of systemRoles) {
    const existing = await db.query.roles.findFirst({
      where: and(eq(roles.organizationId, organizationId), eq(roles.slug, sr.slug)),
    });

    if (!existing) {
      const [role] = await db
        .insert(roles)
        .values({
          organizationId,
          name: sr.name,
          slug: sr.slug,
          description: sr.description,
          isSystem: true,
          ticketViewScope: sr.slug === SYSTEM_ROLE_SLUGS.VIEWER ? "self" : "all",
        })
        .returning();

      const validPermIds = sr.permissionIds.filter((id) => permByKey.hasValue(id));
      if (validPermIds.length > 0) {
        await db.insert(rolePermissions).values(
          validPermIds.map((pid) => ({
            roleId: role.id,
            permissionId: pid,
          })),
        );
      }
    }
  }
}

export async function getTeamMembersWithRoles(teamId: number) {
  return db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    with: {
      user: {
        with: {
          roles: {
            with: {
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function assignUserToTeam(params: {
  userId: number;
  teamId: number;
  isLead?: boolean;
  assignedBy: number;
}) {
  const existing = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, params.teamId), eq(teamMembers.userId, params.userId)),
  });

  if (existing) {
    throw new Error("User is already a member of this team");
  }

  const [member] = await db
    .insert(teamMembers)
    .values({
      teamId: params.teamId,
      userId: params.userId,
      isLead: params.isLead || false,
      createdBy: params.assignedBy,
    })
    .returning();

  return member;
}

export async function removeUserFromTeam(params: { userId: number; teamId: number }) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, params.teamId), eq(teamMembers.userId, params.userId)));

  return { success: true };
}

export async function createGroup(params: {
  organizationId: number;
  name: string;
  description?: string;
  defaultTeamId?: number;
  createdBy: number;
}) {
  const [group] = await db
    .insert(groups)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      defaultTeamId: params.defaultTeamId,
      createdBy: params.createdBy,
    })
    .returning();

  return group;
}

export async function updateGroup(params: {
  groupId: number;
  name?: string;
  description?: string;
  defaultTeamId?: number;
  isActive?: boolean;
  updatedBy: number;
}) {
  const [updated] = await db
    .update(groups)
    .set({
      name: params.name,
      description: params.description,
      defaultTeamId: params.defaultTeamId,
      isActive: params.isActive,
      updatedBy: params.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, params.groupId))
    .returning();

  return updated;
}

export async function deleteGroup(params: { groupId: number; force?: boolean }) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, params.groupId),
    with: {
      teams: true,
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  if (group.teams.length > 0 && !params.force) {
    throw new Error("Cannot delete group with associated teams");
  }

  await db
    .update(groups)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(groups.id, params.groupId));

  return { success: true };
}

export async function listGroups(organizationId: number) {
  return db.query.groups.findMany({
    where: and(eq(groups.organizationId, organizationId), isNull(groups.deletedAt)),
    orderBy: (groups, { asc }) => [asc(groups.name)],
  });
}

export async function listTeams(organizationId: number, groupId?: number) {
  const conditions = [eq(teams.organizationId, organizationId), isNull(teams.deletedAt)];

  if (groupId) {
    conditions.push(eq(teams.groupId, groupId));
  }

  return db.query.teams.findMany({
    where: and(...conditions),
    orderBy: (teams, { asc }) => [asc(teams.name)],
    with: {
      members: {
        with: {
          user: {
            with: {
              roles: {
                with: {
                  role: true,
                },
              },
            },
          },
        },
      },
      group: true,
    },
  });
}

export async function createTeam(params: {
  organizationId: number;
  name: string;
  description?: string;
  groupId?: number;
  autoAssignMethod?: string;
  createdBy: number;
}) {
  const [team] = await db
    .insert(teams)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      description: params.description,
      groupId: params.groupId,
      autoAssignMethod: params.autoAssignMethod || "round_robin",
      createdBy: params.createdBy,
    })
    .returning();

  return team;
}

export async function updateTeam(params: {
  teamId: number;
  name?: string;
  description?: string;
  groupId?: number;
  autoAssignMethod?: string;
  isActive?: boolean;
  updatedBy: number;
}) {
  const [updated] = await db
    .update(teams)
    .set({
      name: params.name,
      description: params.description,
      groupId: params.groupId,
      autoAssignMethod: params.autoAssignMethod,
      isActive: params.isActive,
      updatedBy: params.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, params.teamId))
    .returning();

  return updated;
}

export async function deleteTeam(teamId: number) {
  await db
    .update(teams)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  return { success: true };
}

export async function listPermissions() {
  return db.query.permissions.findMany({
    orderBy: (permissions, { asc }) => [asc(permissions.group), asc(permissions.key)],
  });
}

export async function getUsersByPermission(organizationId: number, permission: string) {
  const perm = await db.query.permissions.findFirst({
    where: eq(permissions.key, permission),
  });

  if (!perm) {
    return [];
  }

  const rolesWithPerm = await db.query.rolePermissions.findMany({
    where: eq(rolePermissions.permissionId, perm.id),
    with: {
      role: {
        with: {
          userRoles: {
            with: {
              user: true,
            },
          },
        },
      },
    },
  });

  const userIds = new Set<number>();
  for (const rp of rolesWithPerm) {
    if (rp.role.organizationId === organizationId && !rp.role.deletedAt && rp.role.isActive) {
      for (const ur of rp.role.userRoles) {
        if (ur.user.isActive && !ur.user.deletedAt) {
          userIds.add(ur.userId);
        }
      }
    }
  }

  return Array.from(userIds);
}
