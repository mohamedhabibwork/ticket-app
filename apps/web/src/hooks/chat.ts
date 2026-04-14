"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseChatSessionsListOptions {
  organizationId: number;
  limit?: number;
}

export function useChatSessionsList(options: UseChatSessionsListOptions) {
  const { organizationId, limit = 50 } = options;

  return useQuery({
    queryKey: ["chat", "sessions", "list", { organizationId, limit }],
    queryFn: () => (orpc as any).chatSessions.list.queryOptions({ organizationId, limit }) as any,
  });
}

export interface UseChatSessionOptions {
  organizationId: number;
  id: number;
}

export function useChatSession(options: UseChatSessionOptions) {
  const { organizationId, id } = options;

  return useQuery({
    queryKey: ["chat", "sessions", "get", { organizationId, id }],
    queryFn: () =>
      (orpc as any).chatSessions.get.queryOptions(
        { organizationId, id },
        { enabled: !isNaN(id) },
      ) as any,
  });
}

export interface UseActiveChatSessionsOptions {
  organizationId: number;
}

export function useActiveChatSessions(options: UseActiveChatSessionsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["chat", "sessions", "active", { organizationId }],
    queryFn: () =>
      (orpc as any).chatSessions.getActiveSessions.queryOptions({ organizationId }) as any,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      sessionId: number;
      agentId: number;
      body: string;
      isInternal?: boolean;
    }) =>
      (orpc as any).chatMessages.createFromAgent.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
        },
        onError: (error: any) => {
          toast.error(`Failed to send message: ${error.message}`);
        },
      }) as any,
  });
}

export function useAssignChatAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; organizationId: number; agentId: number }) =>
      (orpc as any).chatSessions.assignAgent.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
          toast.success("Agent assigned");
        },
        onError: (error: any) => {
          toast.error(`Failed to assign agent: ${error.message}`);
        },
      }) as any,
  });
}

export function useEndChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      id: number;
      organizationId: number;
      status: string;
      endedBy?: number;
    }) =>
      (orpc as any).chatSessions.updateStatus.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
          toast.success("Session ended");
        },
        onError: (error: any) => {
          toast.error(`Failed to end session: ${error.message}`);
        },
      }) as any,
  });
}

export function useRateChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; rating: number }) =>
      (orpc as any).chatSessions.setRating.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
          toast.success("Rating submitted");
        },
        onError: (error: any) => {
          toast.error(`Failed to submit rating: ${error.message}`);
        },
      }) as any,
  });
}
