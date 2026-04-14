"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export interface UseWorkflowExecutionLogsOptions {
  workflowId: number;
  organizationId: number;
  limit?: number;
  offset?: number;
}

export function useWorkflowExecutionLogs(options: UseWorkflowExecutionLogsOptions) {
  const { workflowId, organizationId, limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: [
      "admin",
      "workflows",
      "executionLogs",
      { workflowId, organizationId, limit, offset },
    ],
    queryFn: () =>
      (orpc as any).workflows.getExecutionLogs.queryOptions({
        workflowId,
        organizationId,
        limit,
        offset,
      }) as any,
  });
}

export interface UseWorkflowLogStatsOptions {
  workflowId: number;
  organizationId: number;
}

export function useWorkflowLogStats(options: UseWorkflowLogStatsOptions) {
  const { workflowId, organizationId } = options;

  return useQuery({
    queryKey: ["admin", "workflows", "logStats", { workflowId, organizationId }],
    queryFn: () =>
      (orpc as any).workflowLogs.getStats.queryOptions({
        organizationId,
        workflowId,
      }) as any,
  });
}

export interface UseWorkflowOptions {
  id: number;
  organizationId: number;
}

export function useWorkflow(options: UseWorkflowOptions) {
  const { id, organizationId } = options;

  return useQuery({
    queryKey: ["admin", "workflows", "get", { id, organizationId }],
    queryFn: () =>
      (orpc as any).workflows.get.queryOptions({
        id,
        organizationId,
      }) as any,
  });
}

export interface UseWorkflowsListOptions {
  organizationId: number;
  isActive?: boolean;
}

export function useWorkflowsList(options: UseWorkflowsListOptions) {
  const { organizationId, isActive } = options;

  return useQuery({
    queryKey: ["admin", "workflows", "list", { organizationId, isActive }],
    queryFn: () =>
      (orpc as any).workflows.list.query({
        organizationId,
        isActive,
      }) as any,
  });
}

export function useWorkflowDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: number; organizationId: number }) =>
      (orpc as any).workflows.delete.mutation({
        id: variables.id,
        organizationId: variables.organizationId,
      }) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
      toast.success("Workflow deleted");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

export function useWorkflowToggleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: number; organizationId: number; isActive: boolean }) =>
      (orpc as any).workflows.toggleActive.mutation({
        id: variables.id,
        organizationId: variables.organizationId,
        isActive: variables.isActive,
      }) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
      toast.success("Workflow updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}
