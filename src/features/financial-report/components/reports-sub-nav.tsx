"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";

const LINKS = [
  { label: "Overview", href: ROUTES.reports },
  { label: "Profit & Loss", href: ROUTES.reportsProfitLoss },
  { label: "Balance Sheet", href: ROUTES.reportsBalanceSheet },
  { label: "Cash Flow", href: ROUTES.reportsCashFlow },
  { label: "Revenue", href: ROUTES.reportsRevenue },
  { label: "Expenses", href: ROUTES.reportsExpenses },
  { label: "Rentals", href: ROUTES.reportsRental },
  { label: "Inventory", href: ROUTES.reportsInventory },
  { label: "Customers", href: ROUTES.reportsCustomers },
] as const;

export function ReportsSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Report sections" className="mb-6 flex flex-wrap gap-2">
      {LINKS.map((link) => {
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
