"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseUsersListOptions {
  organizationId: number;
  search?: string;
  roleId?: number;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useUsersList(options: UseUsersListOptions) {
  const { organizationId, search, roleId, isActive, limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: ["users", "list", { organizationId, search, roleId, isActive, limit, offset }],
    queryFn: () =>
      (orpc as any).users.list.queryOptions({
        organizationId,
        ...(search && { search }),
        ...(roleId && { roleId }),
        ...(isActive !== undefined && { isActive }),
        limit,
        offset,
      }) as any,
  });
}

interface UseUsersListRolesOptions {
  organizationId: number;
}

export function useUsersListRoles(options: UseUsersListRolesOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["users", "roles", { organizationId }],
    queryFn: () => (orpc as any).users.listRoles.queryOptions({ organizationId }) as any,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => (orpc as any).users.me.queryOptions() as any,
  });
}

interface UseUserRoleOptions {
  id: number;
}

export function useUserRole(options: UseUserRoleOptions) {
  const { id } = options;

  return useQuery({
    queryKey: ["users", "role", { id }],
    queryFn: () => (orpc as any).users.getRole.queryOptions({ id }) as any,
  });
}

export function useUserUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      id: number;
      organizationId: number;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      phone?: string;
      timezone?: string;
      locale?: string;
      isActive?: boolean;
    }) =>
      (orpc as any).users.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          toast.success("User updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update user: ${error.message}`);
        },
      }) as any,
  });
}

export function useUserDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; organizationId: number }) =>
      (orpc as any).users.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          toast.success("User deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete user: ${error.message}`);
        },
      }) as any,
  });
}
