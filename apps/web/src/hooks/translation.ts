"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

interface UseTranslationConfigOptions {
  organizationId: number;
}

export function useTranslationConfig(options: UseTranslationConfigOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["translation", "config", { organizationId }],
    queryFn: () => (orpc as any).translation.getConfig.queryOptions({ organizationId }) as any,
  });
}

export function useTranslateText() {
  return useMutation({
    mutationFn: (_variables: {
      organizationId: number;
      text: string;
      sourceLang: string;
      targetLang: string;
    }) =>
      (orpc as any).translation.translateText.mutationOptions({
        onError: (error: any) => {
          toast.error(`Translation failed: ${error.message}`);
        },
      }) as any,
  });
}
