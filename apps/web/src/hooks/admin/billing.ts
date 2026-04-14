"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseSubscriptionSeatsOptions {
  organizationId: number;
}

export function useSubscriptionSeats(options: UseSubscriptionSeatsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["billing", "subscription", "seats", { organizationId }],
    queryFn: () => (orpc as any).subscriptions.getSeats.queryOptions({ organizationId }) as any,
  });
}

export interface UsePendingInvitationsOptions {
  organizationId: number;
}

export function usePendingInvitations(options: UsePendingInvitationsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["billing", "subscription", "pendingInvitations", { organizationId }],
    queryFn: () =>
      (orpc as any).subscriptions.getPendingInvitations.queryOptions({ organizationId }) as any,
  });
}
