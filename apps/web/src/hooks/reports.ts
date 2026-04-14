"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

interface UseResponseTimeReportOptions {
  organizationId: number;
}

export function useResponseTimeReport(options: UseResponseTimeReportOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["reports", "responseTime", { organizationId }],
    queryFn: () => (orpc as any).reports.getResponseTime.queryOptions({ organizationId }) as any,
  });
}

interface UseSlaComplianceReportOptions {
  organizationId: number;
}

export function useSlaComplianceReport(options: UseSlaComplianceReportOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["reports", "slaCompliance", { organizationId }],
    queryFn: () => (orpc as any).reports.getSlaCompliance.queryOptions({ organizationId }) as any,
  });
}

interface UseTicketVolumeReportOptions {
  organizationId: number;
  groupBy?: string;
}

export function useTicketVolumeReport(options: UseTicketVolumeReportOptions) {
  const { organizationId, groupBy } = options;

  return useQuery({
    queryKey: ["reports", "ticketVolume", { organizationId, groupBy }],
    queryFn: () =>
      (orpc as any).reports.getTicketVolume.queryOptions({
        organizationId,
        ...(groupBy && { groupBy }),
      }) as any,
  });
}

interface UseResolutionRateReportOptions {
  organizationId: number;
}

export function useResolutionRateReport(options: UseResolutionRateReportOptions) {
  const { organizationId } = options;

  return useQuery({
    queryKey: ["reports", "resolutionRate", { organizationId }],
    queryFn: () => (orpc as any).reports.getResolutionRate.queryOptions({ organizationId }) as any,
  });
}
