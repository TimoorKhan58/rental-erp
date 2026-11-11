"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { REPORT_HUB_CARDS } from "../mappers";
import { ReportsSubNav } from "../components";
import { useFinancialReportPermissions } from "../hooks";

export function ReportsHubPage() {
  const { canReadFinancial, canReadOperational } = useFinancialReportPermissions();

  const financialCards = REPORT_HUB_CARDS.filter((card) => card.category === "financial");
  const operationalCards = REPORT_HUB_CARDS.filter(
    (card) => card.category === "operational",
  );

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Go deeper after the dashboard pulse — P&L, cash, rental performance, and stock."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports" },
        ]}
        actions={null}
      />

      <ReportsSubNav />

      <div className="space-y-6">
        {canReadFinancial ? (
          <SectionCard title="Financial reports">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {financialCards.map((card) => (
                <li key={card.href}>
                  <Link
                    href={card.href}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{card.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {canReadOperational ? (
          <SectionCard title="Operational reports">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {operationalCards.map((card) => (
                <li key={card.href}>
                  <Link
                    href={card.href}
                    className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{card.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        {!canReadFinancial && !canReadOperational ? (
          <SectionCard title="Access">
            <p className="text-sm text-muted-foreground">
              You do not have permission to view financial or operational reports. Contact an
              administrator if you need access.
            </p>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Related modules">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={ROUTES.accounting} className="text-primary hover:underline">
                  Accounting dashboard
                </Link>
              </li>
              <li>
                <Link href={ROUTES.audit} className="text-primary hover:underline">
                  Audit trail
                </Link>
              </li>
              <li>
                <Link href={ROUTES.reportsAnalytics} className="text-primary hover:underline">
                  Executive analytics
                </Link>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Export">
            <p className="text-sm text-muted-foreground">
              Open a report to download CSV of the current page (or the full financial
              statement when that report is not paginated). Filters on screen apply to that
              download. PDF and Excel remain planned.
            </p>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
