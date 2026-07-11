/**
 * Dashboard service — notifications use the live API;
 * remaining widgets stay mock until dedicated dashboard endpoints exist.
 */
import {
  MOCK_DASHBOARD_METRICS,
  MOCK_FINANCIAL_SUMMARY,
  MOCK_INVENTORY_OVERVIEW,
  MOCK_ORGANIZATION_NAME,
  MOCK_QUICK_ACTIONS,
  MOCK_RECENT_ACTIVITY,
  MOCK_RENTAL_TRENDS,
  MOCK_REVENUE_OVERVIEW,
  MOCK_SYSTEM_STATUS,
  MOCK_UPCOMING_TASKS,
} from "../mock";
import type {
  ActivityItem,
  DashboardMetric,
  DashboardNotification,
  DashboardSummary,
  FinancialSummaryItem,
  InventoryOverviewItem,
  QuickAction,
  RentalTrendPoint,
  RevenueOverview,
  SystemStatusItem,
  UpcomingTask,
} from "../types";
import { getNotifications } from "@/features/notification/services";
import type {
  NotificationPriority,
  NotificationResponse,
} from "@/features/notification/types";

const MOCK_DELAY_MS = 400;

function delay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

function priorityToSeverity(
  priority: NotificationPriority,
): DashboardNotification["severity"] {
  switch (priority) {
    case "URGENT":
      return "error";
    case "HIGH":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "info";
  }
}

function toDashboardNotification(
  notification: NotificationResponse,
): DashboardNotification {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.body,
    severity: priorityToSeverity(notification.priority),
    timestamp: notification.createdAt,
    read: notification.isRead,
  };
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return delay({
    organizationName: MOCK_ORGANIZATION_NAME,
    metrics: MOCK_DASHBOARD_METRICS,
  });
}

export async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  return delay(MOCK_DASHBOARD_METRICS);
}

export async function fetchQuickActions(): Promise<QuickAction[]> {
  return delay(MOCK_QUICK_ACTIONS, 200);
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  return delay(MOCK_RECENT_ACTIVITY);
}

export async function fetchDashboardNotifications(): Promise<DashboardNotification[]> {
  const result = await getNotifications({
    page: 1,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return result.items.map(toDashboardNotification);
}

export async function fetchUpcomingTasks(): Promise<UpcomingTask[]> {
  return delay(MOCK_UPCOMING_TASKS);
}

export async function fetchRevenueOverview(): Promise<RevenueOverview> {
  return delay(MOCK_REVENUE_OVERVIEW);
}

export async function fetchRentalTrends(): Promise<RentalTrendPoint[]> {
  return delay(MOCK_RENTAL_TRENDS);
}

export async function fetchInventoryOverview(): Promise<InventoryOverviewItem[]> {
  return delay(MOCK_INVENTORY_OVERVIEW);
}

export async function fetchFinancialSummary(): Promise<FinancialSummaryItem[]> {
  return delay(MOCK_FINANCIAL_SUMMARY);
}

export async function fetchSystemStatus(): Promise<SystemStatusItem[]> {
  return delay(MOCK_SYSTEM_STATUS, 250);
}
