"use client";

import Link from "next/link";
import { SectionCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { AuditActionBadge } from "@/features/audit/components/audit-action-badge";
import { ACTION_LABELS } from "@/features/audit/mappers";
import { useAuditLogs, useAuditPermissions } from "@/features/audit/hooks";
import {
  useProcurementPermissions,
  useProcurements,
  useSupplierPaymentPermissions,
  useSupplierPayments,
} from "@/features/procurement/hooks";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { SUPPLIER_AUDIT_ENTITY_NAME } from "../constants";

type SupplierRecentActivitySectionProps = {
  supplierId: string;
};

type ActivityItem = {
  id: string;
  timestamp: string;
  label: string;
  href?: string;
  kind: "audit" | "procurement" | "payment";
  action?: Parameters<typeof AuditActionBadge>[0]["action"];
};

export function SupplierRecentActivitySection({
  supplierId,
}: SupplierRecentActivitySectionProps) {
  const { canRead: canReadProcurement } = useProcurementPermissions();
  const { canRead: canReadPayments } = useSupplierPaymentPermissions();
  const { canRead: canReadAudit } = useAuditPermissions();

  const procurements = useProcurements({
    supplierId,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const payments = useSupplierPayments({
    supplierId,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const auditLogs = useAuditLogs({
    entityType: SUPPLIER_AUDIT_ENTITY_NAME,
    entityId: supplierId,
    pageSize: 5,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const isLoading =
    (canReadProcurement && procurements.isLoading) ||
    (canReadPayments && payments.isLoading) ||
    (canReadAudit && auditLogs.isLoading);

  if (!canReadProcurement && !canReadPayments && !canReadAudit) {
    return null;
  }

  const activity: ActivityItem[] = [];

  if (canReadProcurement) {
    for (const order of procurements.data?.items ?? []) {
      activity.push({
        id: `po-${order.id}`,
        timestamp: order.updatedAt,
        label: `Purchase order ${order.poNumber} updated`,
        href: ROUTES.procurementDetail(order.id),
        kind: "procurement",
      });
    }
  }

  if (canReadPayments) {
    for (const payment of payments.data?.items ?? []) {
      activity.push({
        id: `pay-${payment.id}`,
        timestamp: payment.createdAt,
        label: `Payment ${payment.paymentNumber} for ${formatCurrency(payment.amount)}`,
        href: ROUTES.procurementDetail(payment.purchaseOrderId),
        kind: "payment",
      });
    }
  }

  if (canReadAudit) {
    for (const entry of auditLogs.data?.items ?? []) {
      activity.push({
        id: `audit-${entry.id}`,
        timestamp: entry.createdAt,
        label: `${ACTION_LABELS[entry.action]} supplier profile`,
        href: ROUTES.auditDetail(entry.id),
        kind: "audit",
        action: entry.action,
      });
    }
  }

  activity.sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  const recentActivity = activity.slice(0, 10);

  return (
    <SectionCard
      title="Recent activity"
      description="Latest purchase orders, payments, and profile changes."
    >
      {isLoading ? (
        <LoadingState label="Loading recent activity..." />
      ) : recentActivity.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent activity recorded for this supplier.
        </p>
      ) : (
        <ul className="space-y-3">
          {recentActivity.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.action ? <AuditActionBadge action={item.action} /> : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{item.label}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
