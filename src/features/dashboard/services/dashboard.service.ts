/**
 * Dashboard service — business pulse uses live reporting API;
 * notifications use the live notification API; quick actions are static.
 */
import { apiGet } from "@/lib/api";
import { getNotifications } from "@/features/notification/services";
import type {
  NotificationPriority,
  NotificationResponse,
} from "@/features/notification/types";
import {
  DASHBOARD_QUICK_ACTIONS,
  toBusinessPulse,
} from "../mappers/business-pulse.mapper";
import type {
  BusinessPulse,
  DashboardNotification,
  LiveDashboardSummary,
  QuickAction,
} from "../types";

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

export async function fetchLiveDashboardSummary(): Promise<LiveDashboardSummary> {
  return apiGet<LiveDashboardSummary>("/reports/dashboard");
}

export async function fetchBusinessPulse(): Promise<BusinessPulse> {
  const summary = await fetchLiveDashboardSummary();
  return toBusinessPulse(summary);
}

export async function fetchQuickActions(): Promise<QuickAction[]> {
  return DASHBOARD_QUICK_ACTIONS;
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
