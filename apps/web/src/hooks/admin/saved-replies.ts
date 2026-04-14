"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseSavedRepliesListOptions {
  organizationId: number;
}

export function useSavedRepliesList(options: UseSavedRepliesListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "savedReplies", "list", { organizationId }],
    queryFn: () =>
      (orpc as any).savedReplies.list.query({
        organizationId,
      }) as any,
  });
}

interface UseSavedReplyFoldersListOptions {
  organizationId: number;
}

export function useSavedReplyFoldersList(options: UseSavedReplyFoldersListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "savedReplies", "folders", { organizationId }],
    queryFn: () => (orpc as any).savedReplies.listFolders.query({ organizationId }) as any,
  });
}

export function useSavedReplyDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { id: number; organizationId: number }) =>
      (orpc as any).savedReplies.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "savedReplies"] });
          toast.success("Reply deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete reply: ${error.message}`);
        },
      }) as any,
  });
}
