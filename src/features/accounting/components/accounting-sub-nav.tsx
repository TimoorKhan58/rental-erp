"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";

const LINKS = [
  { label: "Overview", href: ROUTES.accounting },
  { label: "Chart of accounts", href: ROUTES.accountingChartOfAccounts },
  { label: "Journal entries", href: ROUTES.accountingJournalEntries },
  { label: "General ledger", href: ROUTES.accountingGeneralLedger },
  { label: "Trial balance", href: ROUTES.accountingTrialBalance },
] as const;

export function AccountingSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Accounting sections" className="mb-6 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const isActive =
          link.href === ROUTES.accounting
            ? pathname === ROUTES.accounting
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
