"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseTicketsListOptions {
  organizationId: number;
  limit?: number;
  groupId?: number;
  categoryId?: number;
  contactId?: number;
  assignedAgentId?: number;
  assignedTeamId?: number;
}

export function useTicketsList(options: UseTicketsListOptions) {
  const {
    organizationId,
    limit = 50,
    groupId,
    categoryId,
    contactId,
    assignedAgentId,
    assignedTeamId,
  } = options;

  return useQuery({
    queryKey: [
      "tickets",
      "list",
      { organizationId, limit, groupId, categoryId, contactId, assignedAgentId, assignedTeamId },
    ],
    queryFn: () =>
      (orpc as any).tickets.list.queryOptions({
        organizationId,
        limit,
        ...(groupId && { groupId }),
        ...(categoryId && { categoryId }),
        ...(contactId && { contactId }),
        ...(assignedAgentId && { assignedAgentId }),
        ...(assignedTeamId && { assignedTeamId }),
      }) as any,
  });
}

interface UseTicketTimelineOptions {
  id: number;
  includePrivate?: boolean;
}

export function useTicketTimeline(options: UseTicketTimelineOptions) {
  const { id, includePrivate = true } = options;

  return useQuery({
    queryKey: ["tickets", "timeline", { id, includePrivate }],
    queryFn: () => (orpc as any).tickets.getTimeline.queryOptions({ id, includePrivate }) as any,
  });
}

export function useTicketLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; lockedBy: number }) =>
      (orpc as any).tickets.lock.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tickets", "timeline"] });
        },
      }),
  } as any);
}

export function useTicketUnlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number }) =>
      (orpc as any).tickets.unlock.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tickets", "timeline"] });
        },
      }),
  } as any);
}

export function useTicketCreate() {
  return useMutation({
    mutationFn: (_variables: {
      organizationId: number;
      subject: string;
      descriptionText?: string;
    }) =>
      (orpc as any).tickets.create.mutationOptions({
        onSuccess: (_data: any) => {
          toast.success("Ticket created");
        },
      }) as any,
  });
}

export function useTicketMessageLockThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; lockedBy: number }) =>
      (orpc as any).ticketMessages.lockThread.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tickets", "timeline"] });
          toast.success("Thread locked");
        },
        onError: (error: any) => {
          toast.error(`Failed to lock thread: ${error.message}`);
        },
      }) as any,
  });
}

export function useTicketMessageUnlockThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number }) =>
      (orpc as any).ticketMessages.unlockThread.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tickets", "timeline"] });
          toast.success("Thread unlocked");
        },
        onError: (error: any) => {
          toast.error(`Failed to unlock thread: ${error.message}`);
        },
      }) as any,
  });
}

export function useTicketMessageOmitThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; reason: string; omittedBy: number }) =>
      (orpc as any).ticketMessages.omitThread.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["tickets", "timeline"] });
          toast.success("Thread omitted");
        },
        onError: (error: any) => {
          toast.error(`Failed to omit thread: ${error.message}`);
        },
      }) as any,
  });
}
