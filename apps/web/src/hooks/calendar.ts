"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseCalendarConnectionsOptions {
  userId: number;
}

export function useCalendarConnections(options: UseCalendarConnectionsOptions) {
  const { userId } = options;

  return useQuery({
    queryKey: ["calendar", "connections", { userId }],
    queryFn: () => (orpc as any).calendar.listConnections.queryOptions({ userId }) as any,
  });
}

export interface UseAgentCalendarEventsOptions {
  userId: number;
  startDate: string;
  endDate: string;
}

export function useAgentCalendarEvents(options: UseAgentCalendarEventsOptions) {
  const { userId, startDate, endDate } = options;

  return useQuery({
    queryKey: ["calendar", "events", { userId, startDate, endDate }],
    queryFn: () =>
      (orpc as any).calendar.listAgentEvents.queryOptions({ userId, startDate, endDate }) as any,
  });
}

export function useCreateCalendarEvent() {
  return useMutation({
    mutationFn: (_variables: {
      ticketId: number;
      agentCalendarConnectionId: number;
      title: string;
      description: string;
      startAt: string;
      endAt: string;
    }) =>
      (orpc as any).calendar.createCalendarEvent.mutationOptions({
        onSuccess: () => {
          toast.success("Calendar event created");
        },
        onError: (error: any) => {
          toast.error(`Failed to create event: ${error.message}`);
        },
      }) as any,
  });
}

export function useConnectCalendar() {
  return useMutation({
    mutationFn: (_variables: { userId: number }) =>
      (orpc as any).calendar.getGoogleAuthUrl.mutationOptions({
        onSuccess: (data: any) => {
          window.location.href = data.url;
        },
        onError: (error: any) => {
          toast.error(`Failed to connect calendar: ${error.message}`);
        },
      }) as any,
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { userId: number; id: number }) =>
      (orpc as any).calendar.disconnect.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["calendar"] });
          toast.success("Calendar disconnected");
        },
        onError: (error: any) => {
          toast.error(`Failed to disconnect calendar: ${error.message}`);
        },
      }) as any,
  });
}
