"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useTodoList() {
  return useQuery({
    queryKey: ["todos", "list"],
    queryFn: () => (orpc as any).todo.getAll.queryOptions() as any,
  });
}

export function useTodoCreate() {
  return useMutation({
    mutationFn: (_variables: { text: string }) =>
      (orpc as any).todo.create.mutationOptions() as any,
  });
}

export function useTodoToggle() {
  return useMutation({
    mutationFn: (_variables: { id: number; completed: boolean }) =>
      (orpc as any).todo.toggle.mutationOptions() as any,
  });
}

export function useTodoDelete() {
  return useMutation({
    mutationFn: (_variables: { id: number }) => (orpc as any).todo.delete.mutationOptions() as any,
  });
}
