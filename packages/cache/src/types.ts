export const CACHE_TTL = {
  SESSION: 86400,
  ORG_SETTINGS: 3600,
  ROLE_PERMISSIONS: 1800,
  USER_PROFILE: 900,
  LOOKUPS: 7200,
  TICKET_COUNTS: 60,
} as const;

export const CACHE_KEYS = {
  SESSION: (userId: string) => `session:${userId}`,
  ORG_SETTINGS: (orgId: string) => `org:${orgId}:settings`,
  ROLE_PERMISSIONS: (roleId: string) => `role:${roleId}:permissions`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  LOOKUPS: (orgId: string) => `org:${orgId}:lookups`,
  TICKET_COUNT: (orgId: string, statusId?: string) =>
    statusId ? `org:${orgId}:tickets:status:${statusId}` : `org:${orgId}:tickets:count`,
  SAML_CONFIG: (orgId: string) => `org:${orgId}:saml`,
} as const;

export type CacheTTLKey = keyof typeof CACHE_TTL;
