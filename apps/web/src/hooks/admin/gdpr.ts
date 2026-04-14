"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseGdprRequestsOptions {
  organizationId: number;
  filterStatus?: string;
  filterType?: string;
  limit?: number;
  offset?: number;
}

export function useGdprRequests(options: UseGdprRequestsOptions) {
  const { organizationId, filterStatus, filterType, limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: [
      "admin",
      "gdpr",
      "requests",
      { organizationId, filterStatus, filterType, limit, offset },
    ],
    queryFn: () =>
      (orpc as any).gdpr.list.query({
        organizationId,
        status: filterStatus,
        type: filterType,
        limit,
        offset,
      }) as any,
  });
}
