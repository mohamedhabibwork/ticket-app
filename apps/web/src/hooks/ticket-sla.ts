"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

interface UseBreachedSlaListOptions {
  organizationId: number;
}

export function useBreachedSlaList(options: UseBreachedSlaListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["ticketSla", "breached", { organizationId }],
    queryFn: () => (orpc as any).ticketSla.listBreached.queryOptions({ organizationId }) as any,
  });
}
