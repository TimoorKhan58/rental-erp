"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDateTime } from "@/lib/utils";
import { StockMovementHistoryTable } from "@/features/stock-movement/components/stock-movement-history-table";
import type { StockMovementResponse } from "@/features/stock-movement/types/stock-movement.types";
import type { InventoryResponse } from "@/features/inventory/types";
import { MaintenanceStatusBadge } from "./maintenance-status-badge";
import { useMaintenancePermissions, useMaintenances } from "../hooks";
import { SERVICE_TYPE_LABELS } from "../mappers";
import type { MaintenanceResponse } from "../types";

type AuditSummary = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
};

type MaintenanceAuditSectionProps = {
  maintenanceId: string;
  auditLogs: AuditSummary[];
  auditTotal: number;
  canReadAudit: boolean;
  isLoading: boolean;
};

export function MaintenanceAuditSection({
  maintenanceId,
  auditLogs,
  auditTotal,
  canReadAudit,
  isLoading,
}: MaintenanceAuditSectionProps) {
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
              <Link href={`${ROUTES.audit}?entityType=Maintenance&entityId=${maintenanceId}`} />
            }
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No audit entries found for this maintenance record.
        </p>
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
            <Link href={`${ROUTES.audit}?entityType=Maintenance&entityId=${maintenanceId}`} />
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

export function MaintenanceAccountingSection() {
  return (
    <SectionCard
      title="Accounting entries"
      description="General ledger integration for maintenance jobs."
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
        Starting and completing maintenance updates inventory stock levels, but automatic journal
        posting is not configured for maintenance yet. Record manual journal entries from accounting
        when needed.
      </p>
    </SectionCard>
  );
}

type MaintenanceInventoryImpactSectionProps = {
  maintenance: MaintenanceResponse;
  inventoryRecord?: InventoryResponse;
  stockMovements: StockMovementResponse[];
  canReadMovements: boolean;
  canReadInventory: boolean;
  isLoading: boolean;
  productLabelById: Map<string, string>;
};

export function MaintenanceInventoryImpactSection({
  maintenance,
  inventoryRecord,
  stockMovements,
  canReadMovements,
  canReadInventory,
  isLoading,
  productLabelById,
}: MaintenanceInventoryImpactSectionProps) {
  if (!canReadMovements && !canReadInventory) {
    return (
      <EmptyCard
        title="Inventory impact"
        description="You do not have permission to view inventory details."
      />
    );
  }

  return (
    <div className="space-y-6">
      {canReadInventory ? (
        <SectionCard
          title="Inventory record"
          description="Stock position for the inventory item under maintenance."
          actions={
            inventoryRecord ? (
              <AppButton
                variant="outline"
                size="sm"
                render={<Link href={ROUTES.inventoryDetail(inventoryRecord.id)} />}
              >
                View inventory
              </AppButton>
            ) : null
          }
        >
          {isLoading ? (
            <LoadingState label="Loading inventory..." />
          ) : !inventoryRecord ? (
            <p className="text-sm text-muted-foreground">Inventory record could not be loaded.</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  On hand
                </dt>
                <dd className="text-sm font-medium tabular-nums">
                  {inventoryRecord.quantityOnHand.toLocaleString()}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reserved
                </dt>
                <dd className="text-sm font-medium tabular-nums">
                  {inventoryRecord.reservedQuantity.toLocaleString()}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Available
                </dt>
                <dd className="text-sm font-medium tabular-nums">
                  {inventoryRecord.availableQuantity.toLocaleString()}
                </dd>
              </div>
            </dl>
          )}
        </SectionCard>
      ) : null}

      {canReadMovements ? (
        <SectionCard
          title="Inventory movements"
          description="Stock movements created when this maintenance job is started or completed."
        >
          <StockMovementHistoryTable
            movements={stockMovements}
            isLoading={isLoading}
            productLabelById={productLabelById}
            showProductColumn={false}
            emptyMessage={
              maintenance.status === "COMPLETED" || maintenance.status === "IN_PROGRESS"
                ? "No stock movements found for this maintenance job yet."
                : "Inventory movements will appear after maintenance is started."
            }
          />
        </SectionCard>
      ) : null}
    </div>
  );
}

type MaintenanceHistorySectionProps = {
  productId?: string;
  warehouseId?: string;
  inventoryId?: string;
};

export function MaintenanceHistorySection({
  productId,
  warehouseId,
  inventoryId,
}: MaintenanceHistorySectionProps) {
  const { canRead } = useMaintenancePermissions();
  const { data, isLoading } = useMaintenances({
    productId,
    warehouseId,
    inventoryId,
    pageSize: 5,
    sortBy: "scheduledDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const records = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const filterParams = new URLSearchParams();
  if (inventoryId) {
    filterParams.set("inventoryId", inventoryId);
  } else {
    if (productId) {
      filterParams.set("productId", productId);
    }
    if (warehouseId) {
      filterParams.set("warehouseId", warehouseId);
    }
  }
  const filterHref = `${ROUTES.maintenance}?${filterParams.toString()}`;

  if (isLoading) {
    return (
      <SectionCard title="Maintenance history">
        <LoadingState label="Loading maintenance records..." />
      </SectionCard>
    );
  }

  if (totalCount === 0) {
    return (
      <SectionCard
        title="Maintenance history"
        description="Scheduled and completed maintenance jobs."
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
            View maintenance
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No maintenance records found yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Maintenance history"
      description="Scheduled and completed maintenance jobs."
      actions={
        <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
          View all
        </AppButton>
      }
    >
      <ul className="space-y-2 text-sm">
        {records.map((record) => (
          <li key={record.id} className="flex items-center justify-between gap-3">
            <div>
              <Link
                href={ROUTES.maintenanceDetail(record.id)}
                className="font-medium text-primary hover:underline"
              >
                {record.maintenanceNumber}
              </Link>
              <p className="text-xs text-muted-foreground">
                {SERVICE_TYPE_LABELS[record.serviceType]}
              </p>
            </div>
            <MaintenanceStatusBadge status={record.status} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
