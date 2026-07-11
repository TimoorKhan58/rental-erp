import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import {
  fetchDashboardMetrics,
  fetchDashboardNotifications,
  fetchDashboardSummary,
  fetchFinancialSummary,
  fetchInventoryOverview,
  fetchQuickActions,
  fetchRecentActivity,
  fetchRentalTrends,
  fetchRevenueOverview,
  fetchSystemStatus,
  fetchUpcomingTasks,
} from "../services";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: fetchDashboardSummary,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: fetchDashboardMetrics,
  });
}

export function useQuickActions() {
  return useQuery({
    queryKey: queryKeys.dashboard.quickActions(),
    queryFn: fetchQuickActions,
    staleTime: 5 * 60_000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: fetchRecentActivity,
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

export function useUpcomingTasks() {
  return useQuery({
    queryKey: queryKeys.dashboard.tasks(),
    queryFn: fetchUpcomingTasks,
  });
}

export function useRevenueOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.revenue(),
    queryFn: fetchRevenueOverview,
  });
}

export function useRentalTrends() {
  return useQuery({
    queryKey: queryKeys.dashboard.rentalTrends(),
    queryFn: fetchRentalTrends,
  });
}

export function useInventoryOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.inventory(),
    queryFn: fetchInventoryOverview,
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.financial(),
    queryFn: fetchFinancialSummary,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.dashboard.systemStatus(),
    queryFn: fetchSystemStatus,
    staleTime: 60_000,
  });
}
