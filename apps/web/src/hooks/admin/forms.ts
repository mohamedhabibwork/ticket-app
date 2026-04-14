"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseFormOptions {
  id: number;
  organizationId: number;
}

export function useForm(options: UseFormOptions) {
  const { id, organizationId } = options;

  return useQuery({
    queryKey: ["admin", "forms", "get", { id, organizationId }],
    queryFn: () =>
      (orpc as any).forms.get.queryOptions({ id, organizationId }, { enabled: !isNaN(id) }) as any,
  });
}

export interface UseFormSubmissionsOptions {
  formId: number;
  organizationId: number;
}

export function useFormSubmissions(options: UseFormSubmissionsOptions) {
  const { formId, organizationId } = options;

  return useQuery({
    queryKey: ["admin", "forms", "submissions", { formId, organizationId }],
    queryFn: () =>
      ((orpc as any).forms.getSubmissions?.queryOptions({
        formId,
        organizationId,
      }) || { enabled: false }) as any,
  });
}

export interface UseFormsListOptions {
  organizationId: number;
}

export function useFormsList(options: UseFormsListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "forms", "list", { organizationId }],
    queryFn: () => (orpc as any).forms.list.queryOptions({ organizationId }) as any,
  });
}
