export type DashboardTrend = "up" | "down" | "neutral";

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  trend: DashboardTrend;
  changeLabel: string;
  icon: string;
};

export type DashboardSummary = {
  organizationName: string;
  metrics: DashboardMetric[];
};

export type QuickAction = {
  id: string;
  label: string;
  href: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "info" | "error" | "pending";
  icon: string;
};

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
};

export type UpcomingTask = {
  id: string;
  title: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
};

export type ChartDataPoint = {
  label: string;
  value: number;
};

export type RevenueOverview = {
  period: string;
  data: ChartDataPoint[];
  total: number;
  changePercent: number;
};

export type RentalTrendPoint = {
  month: string;
  active: number;
  completed: number;
};

export type InventoryOverviewItem = {
  id: string;
  label: string;
  value: number;
  description: string;
};

export type FinancialSummaryItem = {
  id: string;
  label: string;
  value: string;
  trend: DashboardTrend;
  changeLabel: string;
};

export type SystemStatusItem = {
  id: string;
  label: string;
  status: "healthy" | "degraded" | "down";
  message: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  activities: ActivityItem[];
  notifications: DashboardNotification[];
  tasks: UpcomingTask[];
  revenueOverview: RevenueOverview;
  rentalTrends: RentalTrendPoint[];
  inventoryOverview: InventoryOverviewItem[];
  financialSummary: FinancialSummaryItem[];
  systemStatus: SystemStatusItem[];
};
