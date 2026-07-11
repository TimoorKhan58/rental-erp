"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { AccountingSubNav } from "../components";
import { AccountListTable } from "../tables";

export function ChartOfAccountsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Chart of accounts"
        description="Browse and filter the organization chart of accounts."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "Chart of accounts" },
        ]}
      />

      <AccountingSubNav />
      <Suspense fallback={null}>
        <AccountListTable />
      </Suspense>
    </PageContainer>
  );
}
