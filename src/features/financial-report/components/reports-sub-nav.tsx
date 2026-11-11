"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { useFinancialReportPermissions } from "../hooks";

const FINANCIAL_LINKS = [
  { label: "Profit & Loss", href: ROUTES.reportsProfitLoss },
  { label: "Balance Sheet", href: ROUTES.reportsBalanceSheet },
  { label: "Cash Flow", href: ROUTES.reportsCashFlow },
  { label: "Revenue", href: ROUTES.reportsRevenue },
  { label: "Expenses", href: ROUTES.reportsExpenses },
] as const;

const OPERATIONAL_LINKS = [
  { label: "Analytics", href: ROUTES.reportsAnalytics },
  { label: "Rentals", href: ROUTES.reportsRental },
  { label: "Inventory", href: ROUTES.reportsInventory },
  { label: "Customers", href: ROUTES.reportsCustomers },
  { label: "Products", href: ROUTES.reportsProducts },
  { label: "Suppliers", href: ROUTES.reportsSuppliers },
  { label: "Warehouses", href: ROUTES.reportsWarehouses },
  { label: "Procurement", href: ROUTES.reportsProcurement },
  { label: "Dispatches", href: ROUTES.reportsDispatches },
  { label: "Returns", href: ROUTES.reportsReturns },
  { label: "Repairs", href: ROUTES.reportsRepairs },
  { label: "Maintenance", href: ROUTES.reportsMaintenance },
] as const;

export function ReportsSubNav() {
  const pathname = usePathname();
  const { canReadFinancial, canReadOperational } = useFinancialReportPermissions();

  const links = [
    { label: "Overview", href: ROUTES.reports },
    ...(canReadFinancial ? FINANCIAL_LINKS : []),
    ...(canReadOperational ? OPERATIONAL_LINKS : []),
  ];

  if (links.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Report sections" className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive =
          link.href === ROUTES.reports
            ? pathname === ROUTES.reports
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
