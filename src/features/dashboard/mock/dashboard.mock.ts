import { ROUTES } from "@/config/routes";
import type {
  ActivityItem,
  DashboardMetric,
  FinancialSummaryItem,
  InventoryOverviewItem,
  QuickAction,
  RentalTrendPoint,
  RevenueOverview,
  SystemStatusItem,
  UpcomingTask,
} from "../types";

export const MOCK_ORGANIZATION_NAME = "Manyar Tent Service";

export const MOCK_DASHBOARD_METRICS: DashboardMetric[] = [
  {
    id: "active-rentals",
    label: "Active Rentals",
    value: "128",
    subtitle: "Currently on rent",
    trend: "up",
    changeLabel: "+12% vs last month",
    icon: "orders",
  },
  {
    id: "products",
    label: "Products",
    value: "1,842",
    subtitle: "Catalog items",
    trend: "up",
    changeLabel: "+4.2% new SKUs",
    icon: "product",
  },
  {
    id: "customers",
    label: "Customers",
    value: "356",
    subtitle: "Active accounts",
    trend: "up",
    changeLabel: "+18 this month",
    icon: "users",
  },
  {
    id: "suppliers",
    label: "Suppliers",
    value: "42",
    subtitle: "Approved vendors",
    trend: "neutral",
    changeLabel: "No change",
    icon: "company",
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "PKR 4.8M",
    subtitle: "Month to date",
    trend: "up",
    changeLabel: "+9.4% vs last month",
    icon: "payments",
  },
  {
    id: "outstanding-payments",
    label: "Outstanding Payments",
    value: "PKR 620K",
    subtitle: "Awaiting collection",
    trend: "down",
    changeLabel: "-6.1% vs last month",
    icon: "payments",
  },
  {
    id: "maintenance-jobs",
    label: "Maintenance Jobs",
    value: "14",
    subtitle: "Scheduled & in progress",
    trend: "neutral",
    changeLabel: "3 due this week",
    icon: "maintenance",
  },
  {
    id: "repairs",
    label: "Repairs",
    value: "9",
    subtitle: "Open repair orders",
    trend: "down",
    changeLabel: "-2 since last week",
    icon: "repairs",
  },
];

export const MOCK_QUICK_ACTIONS: QuickAction[] = [
  { id: "new-customer", label: "New Customer", href: ROUTES.customers },
  { id: "new-rental", label: "New Rental", href: ROUTES.rentalOrders },
  { id: "new-invoice", label: "New Invoice", href: ROUTES.rentalInvoicesNew },
  { id: "receive-payment", label: "Receive Payment", href: ROUTES.paymentsNew },
  { id: "purchase-order", label: "Purchase Order", href: ROUTES.inventory },
  { id: "add-product", label: "Add Product", href: ROUTES.products },
];

export const MOCK_RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    title: "Rental order confirmed",
    description: "RO-2026-0142 confirmed for Al Noor Events.",
    timestamp: "2026-07-11T08:15:00+05:00",
    status: "success",
    icon: "orders",
  },
  {
    id: "act-2",
    title: "Payment received",
    description: "PKR 85,000 received from Horizon Weddings.",
    timestamp: "2026-07-11T07:40:00+05:00",
    status: "success",
    icon: "payments",
  },
  {
    id: "act-3",
    title: "Low stock alert",
    description: "Marquee 40x60 frame stock below threshold.",
    timestamp: "2026-07-10T18:20:00+05:00",
    status: "warning",
    icon: "inventory",
  },
  {
    id: "act-4",
    title: "Repair job opened",
    description: "Tent fabric tear logged for asset AST-118.",
    timestamp: "2026-07-10T16:05:00+05:00",
    status: "pending",
    icon: "repairs",
  },
  {
    id: "act-5",
    title: "New customer onboarded",
    description: "Royal Pavilion added to customer directory.",
    timestamp: "2026-07-10T11:30:00+05:00",
    status: "info",
    icon: "users",
  },
];

export const MOCK_UPCOMING_TASKS: UpcomingTask[] = [
  {
    id: "task-1",
    title: "Approve purchase order PO-2026-031",
    dueDate: "2026-07-12",
    priority: "high",
    status: "pending",
  },
  {
    id: "task-2",
    title: "Review return inspection RTN-2026-018",
    dueDate: "2026-07-12",
    priority: "medium",
    status: "in_progress",
  },
  {
    id: "task-3",
    title: "Follow up outstanding invoice INV-2026-089",
    dueDate: "2026-07-13",
    priority: "high",
    status: "pending",
  },
  {
    id: "task-4",
    title: "Schedule maintenance for lighting rig LG-12",
    dueDate: "2026-07-14",
    priority: "low",
    status: "pending",
  },
];

export const MOCK_REVENUE_OVERVIEW: RevenueOverview = {
  period: "Last 6 months",
  total: 28_400_000,
  changePercent: 9.4,
  data: [
    { label: "Feb", value: 3_800_000 },
    { label: "Mar", value: 4_100_000 },
    { label: "Apr", value: 4_600_000 },
    { label: "May", value: 4_900_000 },
    { label: "Jun", value: 5_200_000 },
    { label: "Jul", value: 5_800_000 },
  ],
};

export const MOCK_RENTAL_TRENDS: RentalTrendPoint[] = [
  { month: "Feb", active: 92, completed: 78 },
  { month: "Mar", active: 98, completed: 85 },
  { month: "Apr", active: 105, completed: 91 },
  { month: "May", active: 112, completed: 96 },
  { month: "Jun", active: 119, completed: 102 },
  { month: "Jul", active: 128, completed: 110 },
];

export const MOCK_INVENTORY_OVERVIEW: InventoryOverviewItem[] = [
  {
    id: "low-stock",
    label: "Low Stock",
    value: 23,
    description: "Items below reorder level",
  },
  {
    id: "out-of-stock",
    label: "Out of Stock",
    value: 5,
    description: "Unavailable for rental",
  },
  {
    id: "assets-rented",
    label: "Assets Rented",
    value: 412,
    description: "Currently deployed",
  },
  {
    id: "assets-available",
    label: "Assets Available",
    value: 287,
    description: "Ready for dispatch",
  },
];

export const MOCK_FINANCIAL_SUMMARY: FinancialSummaryItem[] = [
  {
    id: "monthly-revenue",
    label: "Monthly Revenue",
    value: "PKR 4.8M",
    trend: "up",
    changeLabel: "+9.4%",
  },
  {
    id: "expenses",
    label: "Expenses",
    value: "PKR 1.9M",
    trend: "up",
    changeLabel: "+3.1%",
  },
  {
    id: "profit",
    label: "Profit",
    value: "PKR 2.9M",
    trend: "up",
    changeLabel: "+12.8%",
  },
  {
    id: "outstanding",
    label: "Outstanding",
    value: "PKR 620K",
    trend: "down",
    changeLabel: "-6.1%",
  },
];

export const MOCK_SYSTEM_STATUS: SystemStatusItem[] = [
  {
    id: "database",
    label: "Database",
    status: "healthy",
    message: "All connections operational",
  },
  {
    id: "api",
    label: "API",
    status: "healthy",
    message: "Response time within SLA",
  },
  {
    id: "notifications",
    label: "Notifications",
    status: "healthy",
    message: "Delivery queue clear",
  },
  {
    id: "background-jobs",
    label: "Background Jobs",
    status: "healthy",
    message: "No failed jobs in last 24h",
  },
];
