"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseRolesListOptions {
  organizationId: number;
}

export function useRolesList(options: UseRolesListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["roles", "list", { organizationId }],
    queryFn: () => (orpc as any).roles.list.queryOptions({ organizationId }) as any,
  });
}

export function useRoleUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      id: number;
      name: string;
      description?: string;
      ticketViewScope?: string;
    }) =>
      (orpc as any).roles.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["roles"] });
          toast.success("Role updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update role: ${error.message}`);
        },
      }) as any,
  });
}

export function useRoleDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { roleId: number; userId: number; organizationId: number }) =>
      (orpc as any).roles.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["roles"] });
          toast.success("Role deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete role: ${error.message}`);
        },
      }) as any,
  });
}
