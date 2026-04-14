"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export interface UseKbCategoriesListOptions {
  organizationId: number;
}

export function useKbCategoriesList(options: UseKbCategoriesListOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["kb", "categories", "list", { organizationId }],
    queryFn: () => (orpc as any).kbCategories.list.queryOptions({ organizationId }) as any,
  });
}

interface UseKbCategoryOptions {
  organizationId: number;
  id: number;
}

export function useKbCategory(options: UseKbCategoryOptions) {
  const { organizationId, id } = options;

  return useQuery({
    queryKey: ["kb", "categories", "get", { organizationId, id }],
    queryFn: () =>
      (orpc as any).kbCategories.get.queryOptions(
        { organizationId, id },
        { enabled: !isNaN(id) },
      ) as any,
  });
}

export interface UseKbArticlesListOptions {
  organizationId: number;
  categoryId?: number;
}

export function useKbArticlesList(options: UseKbArticlesListOptions) {
  const { organizationId, categoryId } = options;

  return useQuery({
    queryKey: ["kb", "articles", "list", { organizationId, categoryId }],
    queryFn: () =>
      (orpc as any).kbArticles.list.queryOptions({
        organizationId,
        ...(categoryId && { categoryId }),
      }) as any,
  });
}

export function useKbCategoryCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { organizationId: number; name: string; slug: string }) =>
      (orpc as any).kbCategories.create.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["kb", "categories"] });
          toast.success("Category created");
        },
        onError: (error: any) => {
          toast.error(`Failed to create category: ${error.message}`);
        },
      }) as any,
  });
}

export function useKbCategoryUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: {
      organizationId: number;
      id: number;
      name?: string;
      description?: string;
      slug?: string;
    }) =>
      (orpc as any).kbCategories.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["kb", "categories"] });
          toast.success("Category updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update category: ${error.message}`);
        },
      }) as any,
  });
}

export function useKbCategoryDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { organizationId: number; id: number; deletedBy: number }) =>
      (orpc as any).kbCategories.delete.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["kb", "categories"] });
          toast.success("Category deleted");
        },
        onError: (error: any) => {
          toast.error(`Failed to delete category: ${error.message}`);
        },
      }) as any,
  });
}

export function useKbArticleUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_variables: { organizationId: number; id: number; categoryId?: number }) =>
      (orpc as any).kbArticles.update.mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["kb"] });
          toast.success("Article updated");
        },
        onError: (error: any) => {
          toast.error(`Failed to update article: ${error.message}`);
        },
      }) as any,
  });
}
