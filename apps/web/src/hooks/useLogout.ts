"use client";

import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { orpc } from "@/utils/orpc";

export function useLogout() {
  const { logout, sessionToken } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      if (sessionToken) {
        try {
          await orpc.auth.logout.mutationOptions()({
            sessionToken,
          } as any);
        } catch (error) {
          console.error("Logout API error:", error);
        }
      }
    },
    onSuccess: () => {
      logout();
      navigate({ to: "/portal/login" });
    },
    onError: () => {
      logout();
      navigate({ to: "/portal/login" });
    },
  });
}
