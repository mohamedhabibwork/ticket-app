"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseBrandingOptions {
  organizationId: number;
  enabled?: boolean;
}

export function useOrganizationBranding({ organizationId, enabled = true }: UseBrandingOptions) {
  return useQuery({
    queryKey: ["branding", organizationId],
    queryFn: () => (orpc as any).organizations.getBranding.queryOptions({ organizationId }) as any,
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentOrganizationBranding() {
  return useQuery({
    queryKey: ["currentOrgBranding"],
    queryFn: () => (orpc as any).organizations.getCurrentBranding.queryOptions() as any,
    staleTime: 5 * 60 * 1000,
  });
}
