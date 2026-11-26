"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { AccountingSubNav } from "../components";
import { GeneralLedgerTable } from "../tables";

function GeneralLedgerContent() {
  return <GeneralLedgerTable />;
}

export function GeneralLedgerPage() {
  return (
    <PageContainer>
      <PageHeader
        title="General ledger"
        description="Every entry on one account, in date order, with a running balance."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "General ledger" },
        ]}
      />

      <AccountingSubNav />
      <Suspense fallback={null}>
        <GeneralLedgerContent />
      </Suspense>
    </PageContainer>
  );
}
