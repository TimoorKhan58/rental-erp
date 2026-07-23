export type DashboardTrend = "up" | "down" | "neutral";

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  trend: DashboardTrend;
  changeLabel: string;
  icon: string;
  href?: string;
};

/** Live payload from GET /api/reports/dashboard */
export type LiveDashboardSummary = {
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  totalWarehouses: number;
  inventoryValue: number;
  inventoryQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  rentalOrders: number;
  confirmedOrders: number;
  reservedOrders: number;
  completedRentals: number;
  dispatchesReady: number;
  dispatchesInProgress: number;
  pendingReturns: number;
  repairsPending: number;
  repairsInProgress: number;
  maintenanceScheduled: number;
  maintenanceInProgress: number;
  openPurchaseOrders: number;
  completedPurchaseOrders: number;
  outstandingInvoices: number;
  paidInvoices: number;
  revenueThisMonth: number;
  paymentsThisMonth: number;
  averageRentalDuration: number;
};

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export type OpsHealthTone = "ok" | "neutral" | "warning" | "critical";

export type OpsHealthItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: OpsHealthTone;
  href: string;
};

export type BusinessPulse = {
  headline: string;
  attentionCount: number;
  pulseMetrics: DashboardMetric[];
  attention: AttentionItem[];
  opsHealth: OpsHealthItem[];
  catalog: {
    customers: number;
    products: number;
    suppliers: number;
    warehouses: number;
  };
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
