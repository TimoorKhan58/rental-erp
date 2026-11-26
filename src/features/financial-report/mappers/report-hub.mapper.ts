import { ROUTES } from "@/config/routes";
import type { ReportHubCard } from "../types";

/**
 * Reports in plain words, grouped by the question the owner is asking
 * (usability revamp). `category` still decides who may see a report.
 */
export const REPORT_HUB_CARDS: ReportHubCard[] = [
  // Money
  {
    group: "money",
    title: "Profit & Loss",
    description: "Did I make money? What came in, what went out, and what was left over.",
    href: ROUTES.reportsProfitLoss,
    category: "financial",
  },
  {
    group: "money",
    title: "Cash Flow",
    description: "Money in and out of your cash and bank accounts.",
    href: ROUTES.reportsCashFlow,
    category: "financial",
  },
  {
    group: "money",
    title: "Balance Sheet",
    description: "What you own, what you owe, and what is left for you.",
    href: ROUTES.reportsBalanceSheet,
    category: "financial",
  },
  {
    group: "money",
    title: "Revenue",
    description: "Where your income comes from.",
    href: ROUTES.reportsRevenue,
    category: "financial",
  },
  {
    group: "money",
    title: "Expenses",
    description: "Where your money goes.",
    href: ROUTES.reportsExpenses,
    category: "financial",
  },
  // Rentals and customers
  {
    group: "sales",
    title: "Analytics",
    description: "A one-page snapshot: orders booked, invoiced, collected, stock and work in progress.",
    href: ROUTES.reportsAnalytics,
    category: "operational",
  },
  {
    group: "sales",
    title: "Rental Performance",
    description: "Orders by booking date and status, with their totals (booked, not yet collected).",
    href: ROUTES.reportsRental,
    category: "operational",
  },
  {
    group: "sales",
    title: "Customers",
    description: "Who rents the most, and who still owes you money.",
    href: ROUTES.reportsCustomers,
    category: "operational",
  },
  {
    group: "sales",
    title: "Products",
    description: "Which items rent the most, and which hardly rent at all.",
    href: ROUTES.reportsProducts,
    category: "operational",
  },
  // Stock and buying
  {
    group: "stock",
    title: "Inventory",
    description: "What you have in stock, what is booked, and what is running low.",
    href: ROUTES.reportsInventory,
    category: "operational",
  },
  {
    group: "stock",
    title: "Warehouses",
    description: "How much stock, and how much value, sits in each warehouse.",
    href: ROUTES.reportsWarehouses,
    category: "operational",
  },
  {
    group: "stock",
    title: "Procurement",
    description: "What you bought, by date, supplier and status.",
    href: ROUTES.reportsProcurement,
    category: "operational",
  },
  {
    group: "stock",
    title: "Suppliers",
    description: "How much you buy from each supplier, and what you owe them.",
    href: ROUTES.reportsSuppliers,
    category: "operational",
  },
  // Daily work
  {
    group: "work",
    title: "Dispatches",
    description: "Deliveries: how many went out, and how long they took.",
    href: ROUTES.reportsDispatches,
    category: "operational",
  },
  {
    group: "work",
    title: "Returns",
    description: "What came back, and in what condition.",
    href: ROUTES.reportsReturns,
    category: "operational",
  },
  {
    group: "work",
    title: "Repairs",
    description: "Repair jobs, how long they took and what they cost.",
    href: ROUTES.reportsRepairs,
    category: "operational",
  },
  {
    group: "work",
    title: "Maintenance",
    description: "Planned and finished servicing jobs.",
    href: ROUTES.reportsMaintenance,
    category: "operational",
  },
];

export const REPORT_GROUPS = [
  { id: "money", title: "Money", hint: "Is the business making money?" },
  { id: "sales", title: "Rentals and customers", hint: "What rents, and who rents it?" },
  { id: "stock", title: "Stock and buying", hint: "What you have, and what you buy." },
  { id: "work", title: "Daily work", hint: "Deliveries, returns and upkeep." },
] as const;

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
