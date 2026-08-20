"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { StockMovementHistoryTable } from "@/features/stock-movement/components/stock-movement-history-table";
import type { StockMovementResponse } from "@/features/stock-movement/types/stock-movement.types";
import type { InventoryResponse } from "@/features/inventory/types";
import { RepairStatusBadge } from "./repair-status-badge";
import { useRepairPermissions, useRepairs, useRepairsByReturn } from "../hooks";
import type { RepairResponse } from "../types";

type AuditSummary = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
};

type MaintenanceSummary = {
  id: string;
  maintenanceNumber: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  quantity: number;
};

type RepairAuditSectionProps = {
  repairId: string;
  auditLogs: AuditSummary[];
  auditTotal: number;
  canReadAudit: boolean;
  isLoading: boolean;
};

export function RepairAuditSection({
  repairId,
  auditLogs,
  auditTotal,
  canReadAudit,
  isLoading,
}: RepairAuditSectionProps) {
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
              <Link href={`${ROUTES.audit}?entityType=Repair&entityId=${repairId}`} />
            }
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No audit entries found for this repair.</p>
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
            <Link href={`${ROUTES.audit}?entityType=Repair&entityId=${repairId}`} />
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

export function RepairAccountingSection() {
  return (
    <SectionCard
      title="Accounting entries"
      description="General ledger integration for repair jobs."
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
        Completing a repair updates inventory stock levels, but automatic journal posting is not
        configured for repairs yet. Record manual journal entries from accounting when needed.
      </p>
    </SectionCard>
  );
}

type RepairInventoryImpactSectionProps = {
  repair: RepairResponse;
  inventoryRecord?: InventoryResponse;
  stockMovements: StockMovementResponse[];
  canReadMovements: boolean;
  canReadInventory: boolean;
  isLoading: boolean;
  productLabelById: Map<string, string>;
};

export function RepairInventoryImpactSection({
  repair,
  inventoryRecord,
  stockMovements,
  canReadMovements,
  canReadInventory,
  isLoading,
  productLabelById,
}: RepairInventoryImpactSectionProps) {
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
          description="Stock position for the repaired product at this warehouse."
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
            <p className="text-sm text-muted-foreground">
              No inventory record found for this product and warehouse.
            </p>
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
          description="Stock movements created when this repair is completed."
        >
          <StockMovementHistoryTable
            movements={stockMovements}
            isLoading={isLoading}
            productLabelById={productLabelById}
            showProductColumn={false}
            emptyMessage={
              repair.status === "COMPLETED"
                ? "No stock movements found for this repair yet."
                : "Inventory movements will appear after the repair is completed."
            }
          />
        </SectionCard>
      ) : null}
    </div>
  );
}

type RepairMaintenanceSectionProps = {
  repair: RepairResponse;
  maintenances: MaintenanceSummary[];
  canReadMaintenance: boolean;
  isLoading: boolean;
};

export function RepairMaintenanceSection({
  repair,
  maintenances,
  canReadMaintenance,
  isLoading,
}: RepairMaintenanceSectionProps) {
  if (!canReadMaintenance) {
    return null;
  }

  const filterHref = `${ROUTES.maintenance}?productId=${repair.productId}&warehouseId=${repair.warehouseId}`;

  if (isLoading) {
    return (
      <SectionCard title="Maintenance history">
        <LoadingState label="Loading maintenance records..." />
      </SectionCard>
    );
  }

  if (maintenances.length === 0) {
    return (
      <SectionCard
        title="Maintenance history"
        description="Preventive and service jobs for the same product and warehouse."
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
            View maintenance
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No maintenance records found for this product and warehouse.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Maintenance history"
      description="Preventive and service jobs for the same product and warehouse."
      actions={
        <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
          View all
        </AppButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Number</th>
              <th className="py-2 pr-4 font-medium">Service</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Qty</th>
              <th className="py-2 font-medium">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {maintenances.map((record) => (
              <tr key={record.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={ROUTES.maintenanceDetail(record.id)}
                    className="text-primary hover:underline"
                  >
                    {record.maintenanceNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4">{record.serviceType.replaceAll("_", " ")}</td>
                <td className="py-2 pr-4">{record.status.replaceAll("_", " ")}</td>
                <td className="py-2 pr-4">{record.quantity}</td>
                <td className="py-2">{formatDate(record.scheduledDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

type ReturnRepairFollowUpSectionProps = {
  returnId: string;
  returnStatus: string;
};

export function ReturnRepairFollowUpSection({
  returnId,
  returnStatus,
}: ReturnRepairFollowUpSectionProps) {
  const { canRead, canCreate } = useRepairPermissions();
  const { data, isLoading } = useRepairsByReturn(returnId);

  if (!canRead) {
    return null;
  }

  const repairs = data?.items ?? [];
  const totalCount = data?.meta.total ?? repairs.length;
  const canCreateRepair = canCreate && returnStatus === "COMPLETED";

  return (
    <SectionCard
      title="Repairs"
      description="Repair jobs linked to this return."
      actions={
        <div className="flex flex-wrap gap-2">
          {canCreateRepair ? (
            <AppButton
              size="sm"
              render={<Link href={`${ROUTES.repairsNew}?returnId=${returnId}`} />}
            >
              Create repair
            </AppButton>
          ) : null}
          {totalCount > 0 ? (
            <AppButton
              variant="outline"
              size="sm"
              render={<Link href={`${ROUTES.repairs}?returnId=${returnId}`} />}
            >
              View all repairs
            </AppButton>
          ) : null}
        </div>
      }
    >
      {isLoading ? (
        <LoadingState label="Loading repairs..." />
      ) : totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canCreateRepair
            ? "No repair jobs recorded for this return yet."
            : "Repair jobs can be created after the return is completed."}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {repairs.slice(0, 5).map((record) => (
            <li key={record.id} className="flex items-center justify-between gap-3">
              <Link href={ROUTES.repairDetail(record.id)} className="text-primary hover:underline">
                {record.repairNumber}
              </Link>
              <RepairStatusBadge status={record.status} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

type RepairHistorySectionProps = {
  productId: string;
  warehouseId: string;
};

export function RepairHistorySection({ productId, warehouseId }: RepairHistorySectionProps) {
  const { canRead } = useRepairPermissions();
  const { data, isLoading } = useRepairs({
    productId,
    warehouseId,
    pageSize: 5,
    sortBy: "repairDate",
    sortOrder: "desc",
  });

  if (!canRead) {
    return null;
  }

  const repairs = data?.items ?? [];
  const totalCount = data?.meta.total ?? 0;
  const filterHref = `${ROUTES.repairs}?productId=${productId}&warehouseId=${warehouseId}`;

  if (isLoading) {
    return (
      <SectionCard title="Repair history">
        <LoadingState label="Loading repair records..." />
      </SectionCard>
    );
  }

  if (totalCount === 0) {
    return (
      <SectionCard
        title="Repair history"
        description="Repair jobs for the same product and warehouse."
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
            View repairs
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No repair records found for this product and warehouse.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Repair history"
      description="Repair jobs for the same product and warehouse."
      actions={
        <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
          View all
        </AppButton>
      }
    >
      <ul className="space-y-2 text-sm">
        {repairs.map((record) => (
          <li key={record.id} className="flex items-center justify-between gap-3">
            <Link href={ROUTES.repairDetail(record.id)} className="text-primary hover:underline">
              {record.repairNumber}
            </Link>
            <RepairStatusBadge status={record.status} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
