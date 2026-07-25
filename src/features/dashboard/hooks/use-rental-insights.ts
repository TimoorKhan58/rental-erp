import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { fetchRentalInsights } from "../services/rental-insights.service";
import type { RentalInsightsParams } from "../types/rental-insights.types";

export function useRentalInsights(params: RentalInsightsParams = {}) {
  return useQuery({
    queryKey: queryKeys.dashboard.rentalInsights(params),
    queryFn: () => fetchRentalInsights(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
