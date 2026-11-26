"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { AccountingSubNav } from "../components";
import { TrialBalanceTable } from "../tables";

function TrialBalanceContent() {
  return <TrialBalanceTable />;
}

export function TrialBalancePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Trial balance"
        description="The balance of every account. Money in and money out must match."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "Trial balance" },
        ]}
      />

      <AccountingSubNav />
      <Suspense fallback={null}>
        <TrialBalanceContent />
      </Suspense>
    </PageContainer>
  );
}
