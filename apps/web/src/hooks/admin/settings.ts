"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface UseTranslationUsageStatsOptions {
  organizationId: number;
}

export function useTranslationUsageStats(options: UseTranslationUsageStatsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "settings", "translation", "usageStats", { organizationId }],
    queryFn: () => (orpc as any).translation.getUsageStats.queryOptions({ organizationId }) as any,
  });
}

export interface UseTranslationConfigOptions {
  organizationId: number;
}

export function useTranslationConfig(options: UseTranslationConfigOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "settings", "translation", "config", { organizationId }],
    queryFn: () => (orpc as any).translation.getConfig.queryOptions({ organizationId }) as any,
  });
}

export interface UseLicenseSeatInfoOptions {
  organizationId: number;
}

export function useLicenseSeatInfo(options: UseLicenseSeatInfoOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "settings", "license", "seatInfo", { organizationId }],
    queryFn: () => (orpc as any).onPremise.checkSeatLimit.queryOptions({ organizationId }) as any,
  });
}

export interface UseChatbotAnalyticsOptions {
  organizationId: number;
  days?: number;
}

export function useChatbotAnalytics(options: UseChatbotAnalyticsOptions) {
  const { organizationId, days = 30 } = options;

  return useQuery({
    queryKey: ["admin", "settings", "chatbot", "analytics", { organizationId, days }],
    queryFn: () =>
      (orpc as any).chatbot.getAnalytics.queryOptions({
        organizationId,
        days,
      }) as any,
  });
}

export interface UseChatbotConfigsOptions {
  organizationId: number;
}

export function useChatbotConfigs(options: UseChatbotConfigsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "settings", "chatbot", "configs", { organizationId }],
    queryFn: () => (orpc as any).chatbot.listConfigs.queryOptions({ organizationId }) as any,
  });
}

export interface UseMobileSdkConfigsOptions {
  organizationId: number;
}

export function useMobileSdkConfigs(options: UseMobileSdkConfigsOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["admin", "settings", "mobileSdk", "configs", { organizationId }],
    queryFn: () => (orpc as any).mobileSdk.listConfigs.queryOptions({ organizationId }) as any,
  });
}
