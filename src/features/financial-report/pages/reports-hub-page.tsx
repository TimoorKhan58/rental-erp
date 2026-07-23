"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { REPORT_HUB_CARDS } from "../mappers";
import { ReportsSubNav, ExportPlaceholderButton } from "../components";
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
        actions={<ExportPlaceholderButton />}
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

        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyCard
            title="Audit links"
            description="Links to related audit trails will appear here when audit integration is connected."
          />
          <EmptyCard
            title="Scheduled reports"
            description="Report scheduling will be available in a future phase."
          />
        </div>
      </div>
    </PageContainer>
  );
}
