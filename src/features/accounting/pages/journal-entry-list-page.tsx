"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { ROUTES } from "@/config/routes";
import { AccountingSubNav } from "../components";
import { JournalEntryListTable } from "../tables";

function JournalEntryListContent() {
  return <JournalEntryListTable />;
}

export function JournalEntryListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Journal entries"
        description="View and manage general ledger journal entries."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Accounting", href: ROUTES.accounting },
          { label: "Journal entries" },
        ]}
      />

      <AccountingSubNav />
      <Suspense fallback={null}>
        <JournalEntryListContent />
      </Suspense>
    </PageContainer>
  );
}
