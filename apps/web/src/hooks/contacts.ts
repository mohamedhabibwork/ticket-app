"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export interface UseContactsListOptions {
  organizationId: number;
  search?: string;
  limit?: number;
}

export function useContactsList(options: UseContactsListOptions) {
  const { organizationId, search, limit = 50 } = options;

  return useQuery({
    queryKey: ["contacts", "list", { organizationId, search, limit }],
    queryFn: () =>
      (orpc as any).contacts.list.queryOptions({
        organizationId,
        ...(search && { search }),
        limit,
      }) as any,
  });
}

export interface UseContactOptions {
  organizationId: number;
  id: number;
}

export function useContact(options: UseContactOptions) {
  const { organizationId, id } = options;

  return useQuery({
    queryKey: ["contacts", "get", { organizationId, id }],
    queryFn: () =>
      (orpc as any).contacts.get.queryOptions(
        { organizationId, id },
        { enabled: !isNaN(id) },
      ) as any,
  });
}

export function useContactUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      organizationId: number;
      id: number;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
    }) =>
      (orpc as any).contacts.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          toast.success("Contact updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update contact: ${error.message}`);
        },
      }) as any,
  });
}

export function useContactMerge() {
  return useMutation({
    mutationFn: (_variables: { organizationId: number; sourceId: number; targetId: number }) =>
      (orpc as any).contacts.merge.mutationOptions({
        onSuccess: () => {
          toast.success("Contacts merged");
        },
        onError: (error: any) => {
          toast.error(`Failed to merge contacts: ${error.message}`);
        },
      }) as any,
  });
}
