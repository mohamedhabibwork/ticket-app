"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseSocialAccountsOptions {
  organizationId: number;
  platform?: string;
}

export function useSocialAccounts(options: UseSocialAccountsOptions) {
  const { organizationId, platform } = options;

  return useQuery({
    queryKey: ["admin", "social", "accounts", { organizationId, platform }],
    queryFn: () =>
      (orpc as any).socialAccounts.list.queryOptions({
        organizationId,
        ...(platform && { platform }),
      }) as any,
  });
}

export interface UseDisqusAccountsOptions {
  organizationId: number;
}

export function useDisqusAccounts(options: UseDisqusAccountsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "social", "disqus", "accounts", { organizationId }],
    queryFn: () => (orpc as any).disqus.listAccounts.queryOptions({ organizationId }) as any,
  });
}

export interface UseEcommerceAccountsOptions {
  organizationId: number;
}

export function useEcommerceAccounts(options: UseEcommerceAccountsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "ecommerce", "accounts", { organizationId }],
    queryFn: () =>
      (orpc as any).marketplace.marketplace.listAccounts.queryOptions({ organizationId }) as any,
  });
}
