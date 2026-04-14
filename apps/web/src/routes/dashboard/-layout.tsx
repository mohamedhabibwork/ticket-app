import { Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}
