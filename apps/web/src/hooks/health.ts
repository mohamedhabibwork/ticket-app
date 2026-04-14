"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => (orpc as any).healthCheck.queryOptions() as any,
  });
}
