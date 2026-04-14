"use client";

import { Navigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const _router = useRouter();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    throw Navigate({
      to: "/portal/login",
      search: {
        redirect: window.location.href,
      },
    });
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles.map((r) => r.slug) || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw Navigate({
        to: "/dashboard",
      });
    }
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (isAuthenticated) {
    throw Navigate({
      to: "/dashboard",
    });
  }

  return <>{children}</>;
}

export function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}
