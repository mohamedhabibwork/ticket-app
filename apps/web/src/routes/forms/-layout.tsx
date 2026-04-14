import { Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}
