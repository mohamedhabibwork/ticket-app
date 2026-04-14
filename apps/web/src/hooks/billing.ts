"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseSubscriptionOptions {
  organizationId: number;
}

export function useSubscription(options: UseSubscriptionOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["billing", "subscription", { organizationId }],
    queryFn: () => (orpc as any).subscriptions.get.queryOptions({ organizationId }) as any,
  });
}

export interface UseInvoicesListOptions {
  organizationId: number;
  page: number;
  limit?: number;
}

export function useInvoicesList(options: UseInvoicesListOptions) {
  const { organizationId, page, limit = 20 } = options;

  return useQuery({
    queryKey: ["billing", "invoices", { organizationId, page, limit }],
    queryFn: () => (orpc as any).invoices.list.queryOptions({ organizationId, page, limit }) as any,
  });
}

export interface UsePaymentMethodsListOptions {
  organizationId: number;
}

export function usePaymentMethodsList(options: UsePaymentMethodsListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["billing", "paymentMethods", { organizationId }],
    queryFn: () => (orpc as any).paymentMethods.list.queryOptions({ organizationId }) as any,
  });
}

export function useAvailablePlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => (orpc as any).subscriptions.getAvailablePlans.queryOptions() as any,
  });
}
