"use client";

import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { AccessDeniedState, LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { useAuditPermissions } from "../hooks";
import { AuditListTable } from "../tables";

function AuditListContent() {
  return <AuditListTable />;
}

export function AuditListPage() {
  const { canRead, isLoading } = useAuditPermissions();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Checking permissions..." />
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <AccessDeniedState description="You do not have permission to view audit logs." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Audit trail"
        description="Read-only system activity log recorded by the backend audit engine."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Audit" },
        ]}
      />

      <Suspense fallback={<LoadingState label="Loading audit logs..." />}>
        <AuditListContent />
      </Suspense>
    </PageContainer>
  );
}
