import { ROUTES } from "@/config/routes";
import type { ReportHubCard } from "../types";

export const REPORT_HUB_CARDS: ReportHubCard[] = [
  {
    title: "Profit & Loss",
    description: "Revenue, expenses, and net profit for a selected period.",
    href: ROUTES.reportsProfitLoss,
    category: "financial",
  },
  {
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity as of a selected date.",
    href: ROUTES.reportsBalanceSheet,
    category: "financial",
  },
  {
    title: "Cash Flow",
    description: "Operating cash receipts, payments, and net cash change.",
    href: ROUTES.reportsCashFlow,
    category: "financial",
  },
  {
    title: "Revenue",
    description: "Revenue by income account with totals and trends.",
    href: ROUTES.reportsRevenue,
    category: "financial",
  },
  {
    title: "Expenses",
    description: "Expense account breakdown and totals.",
    href: ROUTES.reportsExpenses,
    category: "financial",
  },
  {
    title: "Rental Performance",
    description: "Rental order KPIs, status mix, and revenue.",
    href: ROUTES.reportsRental,
    category: "operational",
  },
  {
    title: "Inventory",
    description: "Stock levels, values, and low-stock indicators.",
    href: ROUTES.reportsInventory,
    category: "operational",
  },
  {
    title: "Customers",
    description: "Customer revenue, orders, and outstanding balances.",
    href: ROUTES.reportsCustomers,
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
