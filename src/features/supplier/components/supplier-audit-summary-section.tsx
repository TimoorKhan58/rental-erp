"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { AuditActionBadge } from "@/features/audit/components/audit-action-badge";
import { useAuditLogs, useAuditPermissions } from "@/features/audit/hooks";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import { SUPPLIER_AUDIT_ENTITY_NAME } from "../constants";

type SupplierAuditSummarySectionProps = {
  supplierId: string;
};

export function SupplierAuditSummarySection({
  supplierId,
}: SupplierAuditSummarySectionProps) {
  const { canRead } = useAuditPermissions();
  const { data, isLoading } = useAuditLogs({
    entityType: SUPPLIER_AUDIT_ENTITY_NAME,
    entityId: supplierId,
    pageSize: 8,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const entries = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;

  return (
    <SectionCard
      title="Audit summary"
      description="Changes recorded for this supplier profile."
      actions={
        totalCount > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link
                href={`${ROUTES.audit}?entityType=${encodeURIComponent(SUPPLIER_AUDIT_ENTITY_NAME)}&entityId=${supplierId}`}
              />
            }
          >
            View all
          </AppButton>
        ) : null
      }
    >
      {isLoading ? (
        <LoadingState label="Loading audit trail..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No audit events recorded for this supplier yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AuditActionBadge action={entry.action} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-sm">
                  {entry.module} · {entry.entityName}
                </p>
              </div>
              <AppButton
                variant="outline"
                size="sm"
                render={<Link href={ROUTES.auditDetail(entry.id)} />}
              >
                View
              </AppButton>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
