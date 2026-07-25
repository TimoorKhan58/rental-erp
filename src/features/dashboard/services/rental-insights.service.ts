import { apiGet } from "@/lib/api";
import type { RentalInsightsParams, RentalInsightsReport } from "../types/rental-insights.types";

export async function fetchRentalInsights(
  params: RentalInsightsParams = {},
): Promise<RentalInsightsReport> {
  return apiGet<RentalInsightsReport>("/reports/rental-insights", { params });
}
