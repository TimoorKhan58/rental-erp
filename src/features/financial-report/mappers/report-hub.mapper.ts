import { ROUTES } from "@/config/routes";
import type { ReportHubCard } from "../types";

export const REPORT_HUB_CARDS: ReportHubCard[] = [
  {
    title: "Profit & Loss",
    description: "Are we making money this month? Revenue vs cost of running jobs.",
    href: ROUTES.reportsProfitLoss,
    category: "financial",
  },
  {
    title: "Balance Sheet",
    description: "What we own vs what we owe — tents, cash, and liabilities.",
    href: ROUTES.reportsBalanceSheet,
    category: "financial",
  },
  {
    title: "Cash Flow",
    description: "Cash in the door vs cash out — can we pay suppliers this week?",
    href: ROUTES.reportsCashFlow,
    category: "financial",
  },
  {
    title: "Revenue",
    description: "Where billing is coming from — by income line.",
    href: ROUTES.reportsRevenue,
    category: "financial",
  },
  {
    title: "Expenses",
    description: "Where money is leaking — repairs, transport, overhead.",
    href: ROUTES.reportsExpenses,
    category: "financial",
  },
  {
    title: "Rental Performance",
    description: "Bookings, completion rate, and revenue per rental cycle.",
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
    description: "Who pays, who owes, and who books the most events.",
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
