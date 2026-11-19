import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { queryKeys } from "@/lib/query";

import type { BusinessInsights, BusinessInsightsPeriodMonths } from "./business-insights.types";

export function fetchBusinessInsights(months: BusinessInsightsPeriodMonths): Promise<BusinessInsights> {
  return apiGet<BusinessInsights>("/reports/business-insights", {
    params: { months: String(months) },
  });
}

export function useBusinessInsights(months: BusinessInsightsPeriodMonths, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.all, "business-insights", months] as const,
    queryFn: () => fetchBusinessInsights(months),
    enabled,
    staleTime: 5 * 60_000,
  });
}
