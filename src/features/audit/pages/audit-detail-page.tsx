"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import {
  AccessDeniedState,
  LoadingState,
  QueryErrorState,
} from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import { getChangedFields } from "../mappers";
import { useAuditLog, useAuditPermissions } from "../hooks";
import { AuditActionBadge } from "../components/audit-action-badge";
import { AuditStatusBadge } from "../components/audit-status-badge";
import { LazyJsonViewer } from "../viewers";

type AuditDetailPageProps = {
  auditId: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-all text-sm">{display}</dd>
    </div>
  );
}

export function AuditDetailPage({ auditId }: AuditDetailPageProps) {
  const { canRead, isLoading: permissionsLoading } = useAuditPermissions();
  const { data: audit, isLoading, isError, error, refetch } = useAuditLog(auditId);

  if (permissionsLoading || isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading audit event..." />
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

  if (isError || !audit) {
    return (
      <PageContainer>
        <QueryErrorState
          title="Audit event not found"
          description={
            error?.message ?? "The requested audit event could not be loaded."
          }
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const changedFields = getChangedFields(audit.oldValues, audit.newValues);

  return (
    <PageContainer>
      <PageHeader
        title={`Audit ${audit.id.slice(0, 8)}…`}
        description={`${audit.module} · ${audit.entityName}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Audit", href: ROUTES.audit },
          { label: audit.id.slice(0, 8) },
        ]}
        actions={
          <AppButton
            variant="outline"
            leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
            render={<Link href={ROUTES.audit} />}
          >
            Back
          </AppButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Event summary"
            actions={
              <div className="flex gap-2">
                <AuditActionBadge action={audit.action} />
                <AuditStatusBadge status={audit.status} />
              </div>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Audit ID" value={audit.id} />
              <DetailField label="Timestamp" value={formatDateTime(audit.createdAt)} />
              <DetailField label="Entity" value={audit.entityName} />
              <DetailField label="Entity ID" value={audit.recordId} />
              <DetailField label="User" value={audit.userId} />
              <DetailField label="Request ID" value={audit.requestId} />
              <DetailField label="Module" value={audit.module} />
              <DetailField label="Error message" value={audit.errorMessage} />
            </dl>
          </SectionCard>

          <SectionCard title="Change details">
            {changedFields.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Changed fields
                </p>
                <ul className="flex flex-wrap gap-2">
                  {changedFields.map((field) => (
                    <li
                      key={field}
                      className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                    >
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">
                No field-level changes were recorded for this event.
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <LazyJsonViewer value={audit.oldValues} title="Old values" />
              <LazyJsonViewer value={audit.newValues} title="New values" />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Metadata">
            <dl className="space-y-4">
              <DetailField label="IP address" value={audit.ipAddress} />
              <DetailField label="User agent" value={audit.userAgent} />
              <DetailField label="HTTP method" value={audit.httpMethod} />
              <DetailField label="Route" value={audit.route} />
              <DetailField label="Request ID / correlation" value={audit.requestId} />
            </dl>
          </SectionCard>

          <SectionCard title="Raw payload">
            <LazyJsonViewer
              value={audit}
              title="Full audit record"
              defaultExpanded={false}
            />
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
