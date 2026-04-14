"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UsePlatformStatsOptions {
  organizationId?: number;
}

export function usePlatformStats(options: UsePlatformStatsOptions = {}) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "billing", "platformStats", { organizationId }],
    queryFn: () => (orpc as any).admin.getPlatformStats.queryOptions() as any,
  });
}

export interface UseOrganizationsListOptions {
  page?: number;
  limit?: number;
}

export function useOrganizationsList(options: UseOrganizationsListOptions = {}) {
  const { page = 1, limit = 100 } = options;

  return useQuery({
    queryKey: ["admin", "billing", "organizations", { page, limit }],
    queryFn: () => (orpc as any).admin.listOrganizations.queryOptions({ page, limit }) as any,
  });
}
