"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseTeamsListOptions {
  organizationId: number;
}

export function useTeamsList(options: UseTeamsListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["teams", "list", { organizationId }],
    queryFn: () => (orpc as any).teams.list.queryOptions({ organizationId }) as any,
  });
}

interface UseTeamOptions {
  id: number;
}

export function useTeam(options: UseTeamOptions) {
  const { id } = options;

  return useQuery({
    queryKey: ["teams", "get", { id }],
    queryFn: () => (orpc as any).teams.get.queryOptions({ id }, { enabled: !isNaN(id) }) as any,
  });
}

interface UseTeamMembersOptions {
  teamId: number;
}

export function useTeamMembers(options: UseTeamMembersOptions) {
  const { teamId } = options;

  return useQuery({
    queryKey: ["teams", "members", { teamId }],
    queryFn: () =>
      (orpc as any).teams.listMembers.queryOptions({ teamId }, { enabled: !isNaN(teamId) }) as any,
  });
}

export function useTeamUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      id: number;
      name?: string;
      description?: string;
      autoAssignMethod?: string;
    }) =>
      (orpc as any).teams.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["teams"] });
          toast.success("Team updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update team: ${error.message}`);
        },
      }) as any,
  });
}

export function useTeamDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number }) =>
      (orpc as any).teams.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["teams"] });
          toast.success("Team deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete team: ${error.message}`);
        },
      }) as any,
  });
}

export function useTeamAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { teamId: number; userId: number }) =>
      (orpc as any).teams.addMember.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["teams", "members"] });
          toast.success("Member added");
        },
        onError: (error: any) => {
          toast.error(`Failed to add member: ${error.message}`);
        },
      }) as any,
  });
}

export function useTeamRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { teamId: number; userId: number }) =>
      (orpc as any).teams.removeMember.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["teams", "members"] });
          toast.success("Member removed");
        },
        onError: (error: any) => {
          toast.error(`Failed to remove member: ${error.message}`);
        },
      }) as any,
  });
}
