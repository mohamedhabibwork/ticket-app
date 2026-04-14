import { useAuth } from "@/contexts/auth-context";

export function useOrganization() {
  const { user } = useAuth();
  return {
    organizationId: user?.organizationId ?? null,
  };
}

export function useUser() {
  const { user } = useAuth();
  return {
    user,
  };
}
