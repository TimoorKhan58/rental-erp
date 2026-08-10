import { apiGet } from "@/lib/api";
import type {
  AnalyticsDateRangeParams,
  AnalyticsOverviewResponse,
} from "../types";

const REPORTS_BASE = "/reports";

export async function getAnalyticsOverview(
  params: AnalyticsDateRangeParams = {},
): Promise<AnalyticsOverviewResponse> {
  return apiGet<AnalyticsOverviewResponse>(
    `${REPORTS_BASE}/analytics-overview`,
    { params },
  );
}
