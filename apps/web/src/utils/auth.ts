import type { User } from "../hooks/useAuth";

const STORAGE_KEY = "user";

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

export function getCurrentOrganizationId(): number | null {
  return getCurrentUser()?.organizationId ?? null;
}

export function getCurrentUserId(): number | null {
  return getCurrentUser()?.id ?? null;
}
