"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export function useSlaPoliciesList() {
  return useQuery({
    queryKey: ["admin", "sla", "policies"],
    queryFn: () => (orpc as any).slaPolicies.list.query() as any,
  });
}

export function useSlaPriorities() {
  return useQuery({
    queryKey: ["admin", "sla", "priorities"],
    queryFn: () => (orpc as any).slaPolicies.getPriorities.query() as any,
  });
}

export function useSlaPolicyDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number }) =>
      (orpc as any).slaPolicies.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "sla", "policies"] });
          toast.success("Policy deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete policy: ${error.message}`);
        },
      }) as any,
  });
}

export function useSlaPolicyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; isDefault?: boolean }) =>
      (orpc as any).slaPolicies.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "sla", "policies"] });
          toast.success("Policy updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update policy: ${error.message}`);
        },
      }) as any,
  });
}
