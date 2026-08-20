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
import type { ReturnResponse } from "../types";

type AuditSummary = {
  id: string;
  action: string;
  createdAt: string;
  userId: string | null;
};

type ReturnAuditSectionProps = {
  returnId: string;
  auditLogs: AuditSummary[];
  auditTotal: number;
  canReadAudit: boolean;
  isLoading: boolean;
};

export function ReturnAuditSection({
  returnId,
  auditLogs,
  auditTotal,
  canReadAudit,
  isLoading,
}: ReturnAuditSectionProps) {
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
            render={<Link href={`${ROUTES.audit}?entityType=Return&entityId=${returnId}`} />}
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No audit entries found for this return.</p>
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
          render={<Link href={`${ROUTES.audit}?entityType=Return&entityId=${returnId}`} />}
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

export function ReturnAccountingSection() {
  return (
    <SectionCard
      title="Accounting entries"
      description="General ledger integration for returns."
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
        Completing a return updates inventory, rental order status, and may generate damage
        charges on invoices, but automatic journal posting is not configured for returns yet.
        Record manual journal entries from accounting when needed.
      </p>
    </SectionCard>
  );
}

type ReturnInventoryImpactSectionProps = {
  returnRecord: ReturnResponse;
  inventoryRecords: InventoryResponse[];
  stockMovements: StockMovementResponse[];
  canReadMovements: boolean;
  canReadInventory: boolean;
  isLoading: boolean;
  productLabelById: Map<string, string>;
};

export function ReturnInventoryImpactSection({
  returnRecord,
  inventoryRecords,
  stockMovements,
  canReadMovements,
  canReadInventory,
  isLoading,
  productLabelById,
}: ReturnInventoryImpactSectionProps) {
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
          title="Inventory records"
          description="Stock positions for products on this return."
        >
          {isLoading ? (
            <LoadingState label="Loading inventory..." />
          ) : inventoryRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No inventory records found for returned products.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inventoryRecords.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3">
                  <span>
                    {productLabelById.get(record.productId) ?? record.productId}
                    <span className="ml-2 text-muted-foreground">
                      {record.quantityOnHand.toLocaleString()} on hand
                    </span>
                  </span>
                  <Link
                    href={ROUTES.inventoryDetail(record.id)}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {canReadMovements ? (
        <SectionCard
          title="Stock movements"
          description="Restock and release movements linked to this return's rental order."
          actions={
            stockMovements.length > 0 ? (
              <AppButton
                variant="outline"
                size="sm"
                render={<Link href={ROUTES.rentalOrderDetail(returnRecord.rentalOrderId)} />}
              >
                View rental order
              </AppButton>
            ) : null
          }
        >
          <StockMovementHistoryTable
            movements={stockMovements}
            isLoading={isLoading}
            productLabelById={productLabelById}
            showProductColumn
            emptyMessage={
              returnRecord.status === "COMPLETED"
                ? "No stock movements found for this return yet."
                : "Stock movements will appear after the return is completed."
            }
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
