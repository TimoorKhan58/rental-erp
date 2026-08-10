import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getAnalyticsOverview } from "../services";
import type { AnalyticsDateRangeParams } from "../types";

export function useAnalyticsPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.reports.read),
  };
}

export function useAnalyticsOverview(params: AnalyticsDateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.analyticsOverview(params),
    queryFn: () => getAnalyticsOverview(params),
    staleTime: 30_000,
  });
}
