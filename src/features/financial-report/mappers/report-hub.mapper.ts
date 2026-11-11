import { ROUTES } from "@/config/routes";
import type { ReportHubCard } from "../types";

export const REPORT_HUB_CARDS: ReportHubCard[] = [
  {
    title: "Analytics",
    description:
      "Executive snapshot — booked value, billed revenue, collected cash, rentals, inventory, and ops health.",
    href: ROUTES.reportsAnalytics,
    category: "operational",
  },
  {
    title: "Profit & Loss",
    description: "Posted journal income vs expense accounts for the selected journal dates.",
    href: ROUTES.reportsProfitLoss,
    category: "financial",
  },
  {
    title: "Balance Sheet",
    description: "Posted journal assets, liabilities, and equity as of a journal date.",
    href: ROUTES.reportsBalanceSheet,
    category: "financial",
  },
  {
    title: "Cash Flow",
    description: "Posted journal cash-flow summary for the selected journal dates.",
    href: ROUTES.reportsCashFlow,
    category: "financial",
  },
  {
    title: "Revenue",
    description: "Posted journal income accounts for the selected journal dates.",
    href: ROUTES.reportsRevenue,
    category: "financial",
  },
  {
    title: "Expenses",
    description:
      "Posted journal expense accounts — not the operational Expenses module.",
    href: ROUTES.reportsExpenses,
    category: "financial",
  },
  {
    title: "Rental Performance",
    description: "Rental orders by booking date, status, and booked order totals.",
    href: ROUTES.reportsRental,
    category: "operational",
  },
  {
    title: "Inventory",
    description: "What can go out tomorrow — stock levels and low-stock risk.",
    href: ROUTES.reportsInventory,
    category: "operational",
  },
  {
    title: "Customers",
    description:
      "Customer booking totals and open invoice balances (outstanding is not date-filtered).",
    href: ROUTES.reportsCustomers,
    category: "operational",
  },
  {
    title: "Products",
    description: "Product rental volume and booked line totals by booking date.",
    href: ROUTES.reportsProducts,
    category: "operational",
  },
  {
    title: "Suppliers",
    description: "Purchase volume and spend by supplier.",
    href: ROUTES.reportsSuppliers,
    category: "operational",
  },
  {
    title: "Warehouses",
    description: "Stock levels and inventory value by location.",
    href: ROUTES.reportsWarehouses,
    category: "operational",
  },
  {
    title: "Procurement",
    description: "Purchase orders by order date, status, supplier, and warehouse.",
    href: ROUTES.reportsProcurement,
    category: "operational",
  },
  {
    title: "Dispatches",
    description: "Delivery status and turnaround performance.",
    href: ROUTES.reportsDispatches,
    category: "operational",
  },
  {
    title: "Returns",
    description:
      "Return inspections by inspection date. Inventory effect still occurs only on Complete.",
    href: ROUTES.reportsReturns,
    category: "operational",
  },
  {
    title: "Repairs",
    description: "Repair turnaround and cost by product.",
    href: ROUTES.reportsRepairs,
    category: "operational",
  },
  {
    title: "Maintenance",
    description: "Scheduled vs completed maintenance jobs.",
    href: ROUTES.reportsMaintenance,
    category: "operational",
  },
];

export function toPaginationMeta(report: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  return {
    page: report.page,
    pageSize: report.pageSize,
    total: report.total,
    totalPages: report.totalPages,
  };
}
