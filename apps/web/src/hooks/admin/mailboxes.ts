"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseMailboxesListOptions {
  organizationId: number;
}

export function useMailboxesList(options: UseMailboxesListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "mailboxes", "list", { organizationId }],
    queryFn: () => (orpc as any).mailboxes.list.queryOptions({ organizationId }) as any,
  });
}

export interface UseMailboxOptions {
  id: number;
  organizationId: number;
}

export function useMailbox(options: UseMailboxOptions) {
  const { id, organizationId } = options;

  return useQuery({
    queryKey: ["admin", "mailboxes", "get", { id, organizationId }],
    queryFn: () =>
      (orpc as any).mailboxes.get.queryOptions(
        { id, organizationId },
        { enabled: !isNaN(id) },
      ) as any,
  });
}

export interface UseMailboxTeamsOptions {
  organizationId: number;
}

export function useMailboxTeams(options: UseMailboxTeamsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "mailboxes", "teams", { organizationId }],
    queryFn: () => (orpc as any).teams.list.queryOptions({ organizationId }) as any,
  });
}
