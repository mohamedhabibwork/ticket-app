"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseGroupsListOptions {
  organizationId: number;
}

export function useGroupsList(options: UseGroupsListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["groups", "list", { organizationId }],
    queryFn: () => (orpc as any).groups.list.queryOptions({ organizationId }) as any,
  });
}

export interface UseTicketCategoriesListOptions {
  organizationId: number;
}

export function useTicketCategoriesList(options: UseTicketCategoriesListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["ticketCategories", "list", { organizationId }],
    queryFn: () => (orpc as any).ticketCategories.list.queryOptions({ organizationId }) as any,
  });
}
