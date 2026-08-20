"use client";

import Link from "next/link";
import { AppButton } from "@/components/design-system/button";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useMaintenancePermissions } from "@/features/maintenance/hooks";
import { StockMovementHistorySection } from "@/features/stock-movement/components/stock-movement-history-table";
import type { StockMovementResponse } from "@/features/stock-movement/types/stock-movement.types";
import type { InventoryResponse } from "../types";

type MaintenanceSummary = {
  id: string;
  maintenanceNumber: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  quantity: number;
};

type RepairSummary = {
  id: string;
  repairNumber: string;
  status: string;
  repairDate: string;
  quantity: number;
};

type AuditSummary = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
};

type InventoryDetailSectionsProps = {
  inventory: InventoryResponse;
  stockMovements: StockMovementResponse[];
  stockMovementTotal: number;
  maintenances: MaintenanceSummary[];
  repairs: RepairSummary[];
  auditLogs: AuditSummary[];
  permissions: {
    canReadMovements: boolean;
    canReadMaintenance: boolean;
    canReadRepairs: boolean;
    canReadAudit: boolean;
  };
  isLoading: boolean;
};

export function InventoryDetailSections({
  inventory,
  stockMovements,
  stockMovementTotal,
  maintenances,
  repairs,
  auditLogs,
  permissions,
  isLoading,
}: InventoryDetailSectionsProps) {
  return (
    <>
      <InventoryStockMovementSection
        inventoryId={inventory.id}
        stockMovements={stockMovements}
        stockMovementTotal={stockMovementTotal}
        canRead={permissions.canReadMovements}
        isLoading={isLoading}
      />

      <InventoryMaintenanceSection
        inventoryId={inventory.id}
        maintenances={maintenances}
        canRead={permissions.canReadMaintenance}
        isLoading={isLoading}
      />

      <InventoryRepairSection
        inventory={inventory}
        repairs={repairs}
        canRead={permissions.canReadRepairs}
        isLoading={isLoading}
      />

      <InventoryAuditSection
        inventoryId={inventory.id}
        auditLogs={auditLogs}
        canRead={permissions.canReadAudit}
        isLoading={isLoading}
      />
    </>
  );
}

function InventoryStockMovementSection({
  inventoryId,
  stockMovements,
  stockMovementTotal,
  canRead,
  isLoading,
}: {
  inventoryId: string;
  stockMovements: StockMovementResponse[];
  stockMovementTotal: number;
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Activity history"
        description="You do not have permission to view stock movements."
      />
    );
  }

  return (
    <StockMovementHistorySection
      title="Activity history"
      description="Stock movements from procurement, rentals, dispatch, returns, maintenance, and manual adjustments."
      actions={
        stockMovementTotal > 0 ? (
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link
                href={`${ROUTES.reportsInventory}?search=${encodeURIComponent(inventoryId)}`}
              />
            }
          >
            Inventory report
          </AppButton>
        ) : null
      }
      movements={stockMovements}
      isLoading={isLoading}
      emptyMessage="No stock movements recorded for this inventory record yet."
    />
  );
}

function InventoryMaintenanceSection({
  inventoryId,
  maintenances,
  canRead,
  isLoading,
}: {
  inventoryId: string;
  maintenances: MaintenanceSummary[];
  canRead: boolean;
  isLoading: boolean;
}) {
  const { canCreate } = useMaintenancePermissions();

  if (!canRead) {
    return null;
  }

  const maintenanceActions = (
    <div className="flex flex-wrap gap-2">
      {canCreate ? (
        <AppButton
          size="sm"
          render={<Link href={`${ROUTES.maintenanceNew}?inventoryId=${inventoryId}`} />}
        >
          Create maintenance
        </AppButton>
      ) : null}
      <AppButton
        variant="outline"
        size="sm"
        render={<Link href={`${ROUTES.maintenance}?inventoryId=${inventoryId}`} />}
      >
        {maintenances.length === 0 ? "View maintenance" : "View all"}
      </AppButton>
    </div>
  );

  if (isLoading) {
    return (
      <SectionCard title="Maintenance history">
        <LoadingState label="Loading maintenance records..." />
      </SectionCard>
    );
  }

  if (maintenances.length === 0) {
    return (
      <SectionCard title="Maintenance history" actions={maintenanceActions}>
        <p className="text-sm text-muted-foreground">
          No maintenance records linked to this inventory item yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Maintenance history" actions={maintenanceActions}>
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

function InventoryRepairSection({
  inventory,
  repairs,
  canRead,
  isLoading,
}: {
  inventory: InventoryResponse;
  repairs: RepairSummary[];
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return null;
  }

  const filterHref = `${ROUTES.repairs}?productId=${inventory.productId}&warehouseId=${inventory.warehouseId}`;

  if (isLoading) {
    return (
      <SectionCard title="Repair history">
        <LoadingState label="Loading repair records..." />
      </SectionCard>
    );
  }

  if (repairs.length === 0) {
    return (
      <SectionCard
        title="Repair history"
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={filterHref} />}>
            View repairs
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No repair records linked to this inventory item yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Repair history"
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
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Qty</th>
              <th className="py-2 font-medium">Repair date</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((record) => (
              <tr key={record.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={ROUTES.repairDetail(record.id)}
                    className="text-primary hover:underline"
                  >
                    {record.repairNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4">{record.status.replaceAll("_", " ")}</td>
                <td className="py-2 pr-4">{record.quantity}</td>
                <td className="py-2">{formatDate(record.repairDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function InventoryAuditSection({
  inventoryId,
  auditLogs,
  canRead,
  isLoading,
}: {
  inventoryId: string;
  auditLogs: AuditSummary[];
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Audit summary"
        description="You do not have permission to view audit logs."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Audit summary">
        <LoadingState label="Loading audit trail..." />
      </SectionCard>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <SectionCard
        title="Audit summary"
        actions={
          <AppButton
            variant="outline"
            size="sm"
            render={
              <Link href={`${ROUTES.audit}?entityType=Inventory&entityId=${inventoryId}`} />
            }
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No audit entries found for this record.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Audit summary"
      actions={
        <AppButton
          variant="outline"
          size="sm"
          render={<Link href={`${ROUTES.audit}?entityType=Inventory&entityId=${inventoryId}`} />}
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
