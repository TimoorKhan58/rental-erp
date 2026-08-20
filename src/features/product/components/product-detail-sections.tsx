"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { InventoryResponse } from "@/features/inventory/types";
import type { ProductResponse } from "../types";

type ProductDetailSectionsProps = {
  product: ProductResponse;
  categoryName: string | null;
  brandName: string | null;
  unitName: string | null;
  tagNames: string[];
  attributeEntries: Array<{ label: string; value: string }>;
  inventoryRows: InventoryResponse[];
  inventorySummary: {
    quantityOnHand: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  warehouseNameById: Map<string, string>;
  procurementRows: Array<{
    orderId: string;
    poNumber: string;
    status: string;
    orderDate: string;
    quantity: number;
    unitCost: number;
    receivedQuantity: number;
  }>;
  rentalStats: {
    rentalCount: number;
    rentedQuantity: number;
    quantityDays: number;
    revenue: number;
    quantityOnHand: number;
  } | null;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    userId: string | null;
  }>;
  permissions: {
    canReadInventory: boolean;
    canReadProcurement: boolean;
    canReadReports: boolean;
    canReadAudit: boolean;
  };
  isLoading: boolean;
};

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

export function ProductDetailSections({
  product,
  categoryName,
  brandName,
  unitName,
  tagNames,
  attributeEntries,
  inventoryRows,
  inventorySummary,
  warehouseNameById,
  procurementRows,
  rentalStats,
  auditLogs,
  permissions,
  isLoading,
}: ProductDetailSectionsProps) {
  return (
    <>
      <SectionCard title="Classification">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Category" value={categoryName} />
          <DetailField label="Brand" value={brandName} />
          <DetailField label="Catalog unit" value={unitName} />
          <DetailField
            label="Tags"
            value={tagNames.length > 0 ? tagNames.join(", ") : null}
          />
        </dl>
      </SectionCard>

      {attributeEntries.length > 0 ? (
        <SectionCard title="Attributes">
          <dl className="grid gap-4 sm:grid-cols-2">
            {attributeEntries.map((entry) => (
              <DetailField key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </dl>
        </SectionCard>
      ) : null}

      {product.specifications.length > 0 ? (
        <SectionCard title="Specifications">
          <dl className="grid gap-4 sm:grid-cols-2">
            {product.specifications.map((spec) => (
              <DetailField key={spec.id} label={spec.key} value={spec.value} />
            ))}
          </dl>
        </SectionCard>
      ) : null}

      {product.images.length > 0 ? (
        <SectionCard title="Images">
          <ul className="space-y-2 text-sm">
            {product.images.map((image) => (
              <li key={image.id}>
                <a
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {image.altText ?? image.url}
                </a>
                {image.isPrimary ? (
                  <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <ProductInventorySection
        productId={product.id}
        inventoryRows={inventoryRows}
        inventorySummary={inventorySummary}
        warehouseNameById={warehouseNameById}
        canRead={permissions.canReadInventory}
        isLoading={isLoading}
      />

      <ProductProcurementSection
        procurementRows={procurementRows}
        canRead={permissions.canReadProcurement}
        isLoading={isLoading}
      />

      <ProductRentalStatsSection
        rentalStats={rentalStats}
        canRead={permissions.canReadReports}
        isLoading={isLoading}
      />

      <ProductWarehouseSection
        inventoryRows={inventoryRows}
        warehouseNameById={warehouseNameById}
        canRead={permissions.canReadInventory}
        isLoading={isLoading}
      />

      <ProductAuditSection
        productId={product.id}
        auditLogs={auditLogs}
        canRead={permissions.canReadAudit}
        isLoading={isLoading}
      />
    </>
  );
}

function ProductInventorySection({
  productId,
  inventoryRows,
  inventorySummary,
  canRead,
  isLoading,
}: {
  productId: string;
  inventoryRows: InventoryResponse[];
  inventorySummary: {
    quantityOnHand: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Inventory summary"
        description="You do not have permission to view inventory data."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Inventory summary">
        <LoadingState label="Loading inventory..." />
      </SectionCard>
    );
  }

  if (inventoryRows.length === 0) {
    return (
      <SectionCard
        title="Inventory summary"
        actions={
          <AppButton
            variant="outline"
            size="sm"
            render={<Link href={`${ROUTES.inventory}?productId=${productId}`} />}
          >
            View inventory
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No inventory records are linked to this product yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Inventory summary"
      actions={
        <AppButton
          variant="outline"
          size="sm"
          leftIcon={<ArrowUpRightIcon className="size-4" aria-hidden="true" />}
          render={<Link href={`${ROUTES.inventory}?productId=${productId}`} />}
        >
          View all
        </AppButton>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="On hand" value={String(inventorySummary.quantityOnHand)} />
        <MetricCard label="Reserved" value={String(inventorySummary.reservedQuantity)} />
        <MetricCard label="Available" value={String(inventorySummary.availableQuantity)} />
      </div>
    </SectionCard>
  );
}

function ProductWarehouseSection({
  inventoryRows,
  warehouseNameById,
  canRead,
  isLoading,
}: {
  inventoryRows: InventoryResponse[];
  warehouseNameById: Map<string, string>;
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Warehouse availability"
        description="You do not have permission to view warehouse stock."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Warehouse availability">
        <LoadingState label="Loading warehouse stock..." />
      </SectionCard>
    );
  }

  if (inventoryRows.length === 0) {
    return (
      <SectionCard title="Warehouse availability">
        <p className="text-sm text-muted-foreground">No warehouse stock assigned yet.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Warehouse availability">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Warehouse</th>
              <th className="py-2 pr-4 font-medium">On hand</th>
              <th className="py-2 pr-4 font-medium">Reserved</th>
              <th className="py-2 font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {inventoryRows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={ROUTES.inventoryDetail(row.id)}
                    className="text-primary hover:underline"
                  >
                    {warehouseNameById.get(row.warehouseId) ?? row.warehouseId}
                  </Link>
                </td>
                <td className="py-2 pr-4">{row.quantityOnHand}</td>
                <td className="py-2 pr-4">{row.reservedQuantity}</td>
                <td className="py-2">{row.availableQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function ProductProcurementSection({
  procurementRows,
  canRead,
  isLoading,
}: {
  procurementRows: Array<{
    orderId: string;
    poNumber: string;
    status: string;
    orderDate: string;
    quantity: number;
    unitCost: number;
    receivedQuantity: number;
  }>;
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Procurement history"
        description="You do not have permission to view purchase orders."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Procurement history">
        <LoadingState label="Loading purchase orders..." />
      </SectionCard>
    );
  }

  if (procurementRows.length === 0) {
    return (
      <SectionCard
        title="Procurement history"
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={ROUTES.procurements} />}>
            View POs
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No purchase orders include this product yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Procurement history"
      actions={
        <AppButton variant="outline" size="sm" render={<Link href={ROUTES.procurements} />}>
          View all
        </AppButton>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">PO number</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Qty</th>
              <th className="py-2 pr-4 font-medium">Unit cost</th>
              <th className="py-2 font-medium">Order date</th>
            </tr>
          </thead>
          <tbody>
            {procurementRows.map((row) => (
              <tr key={`${row.orderId}-${row.quantity}`} className="border-b last:border-b-0">
                <td className="py-2 pr-4">
                  <Link
                    href={ROUTES.procurementDetail(row.orderId)}
                    className="text-primary hover:underline"
                  >
                    {row.poNumber}
                  </Link>
                </td>
                <td className="py-2 pr-4">{row.status.replaceAll("_", " ")}</td>
                <td className="py-2 pr-4">
                  {row.receivedQuantity}/{row.quantity}
                </td>
                <td className="py-2 pr-4">{formatCurrency(row.unitCost)}</td>
                <td className="py-2">{formatDate(row.orderDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function ProductRentalStatsSection({
  rentalStats,
  canRead,
  isLoading,
}: {
  rentalStats: {
    rentalCount: number;
    rentedQuantity: number;
    quantityDays: number;
    revenue: number;
    quantityOnHand: number;
  } | null;
  canRead: boolean;
  isLoading: boolean;
}) {
  if (!canRead) {
    return (
      <EmptyCard
        title="Rental statistics"
        description="You do not have permission to view rental reports."
      />
    );
  }

  if (isLoading) {
    return (
      <SectionCard title="Rental statistics">
        <LoadingState label="Loading rental statistics..." />
      </SectionCard>
    );
  }

  if (!rentalStats) {
    return (
      <SectionCard
        title="Rental statistics"
        actions={
          <AppButton variant="outline" size="sm" render={<Link href={ROUTES.reportsProducts} />}>
            Product report
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          No rental activity recorded for this product yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Rental statistics"
      actions={
        <AppButton variant="outline" size="sm" render={<Link href={ROUTES.reportsProducts} />}>
          Full report
        </AppButton>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Rental orders" value={String(rentalStats.rentalCount)} />
        <MetricCard label="Rented qty" value={String(rentalStats.rentedQuantity)} />
        <MetricCard label="Quantity-days" value={String(rentalStats.quantityDays)} />
        <MetricCard label="Revenue" value={formatCurrency(rentalStats.revenue)} />
      </div>
    </SectionCard>
  );
}

function ProductAuditSection({
  productId,
  auditLogs,
  canRead,
  isLoading,
}: {
  productId: string;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    userId: string | null;
  }>;
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
              <Link href={`${ROUTES.audit}?entityType=Product&entityId=${productId}`} />
            }
          >
            View audit
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">No audit entries found for this product.</p>
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
          render={<Link href={`${ROUTES.audit}?entityType=Product&entityId=${productId}`} />}
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
