"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";

type AuditSummary = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
};

type ProcurementDetailSectionsProps = {
  procurementId: string;
  auditLogs: AuditSummary[];
  auditTotal: number;
  canReadAudit: boolean;
  isLoading: boolean;
};

export function ProcurementAuditSection({
  procurementId,
  auditLogs,
  auditTotal,
  canReadAudit,
  isLoading,
}: ProcurementDetailSectionsProps) {
  if (!canReadAudit) {
    return (
      <EmptyCard
        title="Audit timeline"
        description="You do not have permission to view audit logs."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Audit timeline">
        <LoadingState label="Loading audit trail..." />
      </SectionCard>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <SectionCard
        title="Audit timeline"
        actions={
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.audit}?entityType=PurchaseOrder&entityId=${procurementId}`} />
            }
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No audit entries found for this order.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Audit timeline"
      description={
        auditTotal > auditLogs.length
          ? `Showing ${auditLogs.length} of ${auditTotal} entries`
          : undefined
      }
      actions={
        <AppButton
          variant="outline"
          size="sm"
          render={
            <Link href={`${ROUTES.audit}?entityType=PurchaseOrder&entityId=${procurementId}`} />
          }
        >
          View all
        </AppButton>
      }
    >
      <ul className="space-y-3">
        {auditLogs.map((log) => (
          <li key={log.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                  {log.userId ? ` · User ${log.userId.slice(0, 8)}…` : ""}
                </p>
              </div>
              <Link href={ROUTES.auditDetail(log.id)} className="text-primary hover:underline">
                Details
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function ProcurementAccountingSection() {
  return (
    <SectionCard
      title="Accounting entries"
      description="General ledger integration for purchase orders."
      actions={
        <AppButton
          variant="outline"
          size="sm"
          render={<Link href={ROUTES.accountingJournalEntries} />}
        >
          Journal entries
        </AppButton>
      }
    >
      <p className="text-sm text-muted-foreground">
        Receive and supplier payment flows update inventory and payment balances, but automatic
        journal posting is not configured for purchase orders yet. Record manual journal entries
        from accounting when needed.
      </p>
    </SectionCard>
  );
}
