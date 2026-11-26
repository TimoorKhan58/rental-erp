"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { REPORT_GROUPS, REPORT_HUB_CARDS } from "../mappers/report-hub.mapper";
import { useFinancialReportPermissions } from "../hooks";

/**
 * Reports, grouped by the question being asked. One set of links (the
 * cards): the chip row that repeated all 18 reports above them is gone here,
 * and each report keeps its own row for switching between reports.
 */
export function ReportsHubPage() {
  const { canReadFinancial, canReadOperational } = useFinancialReportPermissions();

  const visible = REPORT_HUB_CARDS.filter((card) =>
    card.category === "financial" ? canReadFinancial : canReadOperational,
  );

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Pick the question you want answered. Every report can be downloaded as a CSV file."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports" },
        ]}
        actions={null}
      />

      <div className="space-y-6">
        {REPORT_GROUPS.map((group) => {
          const cards = visible.filter((card) => card.group === group.id);
          if (cards.length === 0) {
            return null;
          }
          return (
            <SectionCard key={group.id} title={group.title} description={group.hint}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                  <li key={card.href}>
                    <Link
                      href={card.href}
                      className="block h-full rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <p className="text-sm font-medium">{card.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          );
        })}

        {visible.length === 0 ? (
          <SectionCard title="No access">
            <p className="text-sm text-muted-foreground">
              You do not have permission to view reports. Ask the owner if you need access.
            </p>
          </SectionCard>
        ) : null}
      </div>
    </PageContainer>
  );
}
