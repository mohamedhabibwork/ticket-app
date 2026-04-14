"use client";

import { useAuth } from "./useAuth";

export function useOrganization() {
  const { user, isLoading } = useAuth();
  return {
    organizationId: user?.organizationId ?? null,
    isLoading,
  };
}
