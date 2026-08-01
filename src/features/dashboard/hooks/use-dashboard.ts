import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  fetchBusinessPulse,
  fetchDashboardNotifications,
  fetchQuickActions,
} from "../services";

export function useBusinessPulse() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: fetchBusinessPulse,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useQuickActions() {
  return useQuery({
    queryKey: queryKeys.dashboard.quickActions(),
    queryFn: fetchQuickActions,
    staleTime: 5 * 60_000,
  });
}

export function useDashboardNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list({
      page: 1,
      pageSize: 5,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    queryFn: fetchDashboardNotifications,
    staleTime: 30_000,
  });
}
