"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BoxesIcon,
  PencilIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard, MetricCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useProduct } from "@/features/product/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import { deriveStockStatus } from "../mappers";
import {
  useInventory,
  useInventoryFilterOptions,
  useInventoryPermissions,
} from "../hooks";
import { InventoryStatusBadge } from "../components/inventory-status-badge";
import { InventoryStockStatusBadge } from "../components/inventory-stock-status-badge";
import { DeleteInventoryDialog } from "../dialogs/delete-inventory-dialog";
import { EditInventoryDialog } from "../dialogs/edit-inventory-dialog";
import { ToggleInventoryStatusDialog } from "../dialogs/toggle-inventory-status-dialog";

type InventoryDetailPageProps = {
  inventoryId: string;
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
      <dd className="text-sm">{display}</dd>
    </div>
  );
}

export function InventoryDetailPage({ inventoryId }: InventoryDetailPageProps) {
  const router = useRouter();
  const { data: inventory, isLoading, isError, error, refetch } = useInventory(inventoryId);
  const { canUpdate, canDelete } = useInventoryPermissions();
  const { productLabelById, warehouseLabelById } = useInventoryFilterOptions();
  const { data: product } = useProduct(inventory?.productId ?? "");
  const { data: warehouse } = useWarehouse(inventory?.warehouseId ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading inventory details..." />
      </PageContainer>
    );
  }

  if (isError || !inventory) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Inventory record not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested inventory record could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.inventory} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const productLabel = productLabelById.get(inventory.productId) ?? inventory.productId;
  const warehouseLabel =
    warehouseLabelById.get(inventory.warehouseId) ?? inventory.warehouseId;
  const stockStatus = deriveStockStatus(inventory);

  return (
    <PageContainer>
      <PageHeader
        title={productLabel}
        description={`Warehouse: ${warehouseLabel}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Inventory", href: ROUTES.inventory },
          { label: productLabel },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.inventory} />}
            >
              Back
            </AppButton>
            {canUpdate ? (
              <AppButton
                variant="outline"
                leftIcon={
                  inventory.isActive ? (
                    <UserXIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheckIcon className="size-4" aria-hidden="true" />
                  )
                }
                onClick={() => setStatusOpen(true)}
              >
                {inventory.isActive ? "Deactivate" : "Activate"}
              </AppButton>
            ) : null}
            {canUpdate ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </AppButton>
            ) : null}
            {canDelete ? (
              <AppButton
                variant="destructive"
                leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="On hand"
          value={inventory.quantityOnHand.toLocaleString()}
          icon={<BoxesIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
        />
        <MetricCard
          label="Reserved"
          value={inventory.reservedQuantity.toLocaleString()}
          hint="Allocated to active reservations"
        />
        <MetricCard
          label="Available"
          value={inventory.availableQuantity.toLocaleString()}
          hint="On hand minus reserved"
        />
        <MetricCard
          label="Reorder level"
          value={inventory.minimumStock.toLocaleString()}
          hint="Minimum stock threshold"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Stock summary"
            actions={<InventoryStockStatusBadge status={stockStatus} />}
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Quantity on hand" value={inventory.quantityOnHand} />
              <DetailField label="Reserved quantity" value={inventory.reservedQuantity} />
              <DetailField label="Available quantity" value={inventory.availableQuantity} />
              <DetailField label="Reorder level" value={inventory.minimumStock} />
              <DetailField
                label="Maximum stock"
                value={inventory.maximumStock ?? null}
              />
              <DetailField
                label="Record status"
                value={inventory.isActive ? "Active" : "Inactive"}
              />
            </dl>
          </SectionCard>

          <SectionCard title="Product information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Product" value={product?.name ?? productLabel} />
              <DetailField label="Product code" value={product?.productCode} />
              <DetailField label="Unit" value={product?.unit} />
              <DetailField label="Product ID" value={inventory.productId} />
              {product ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.productDetail(product.id)} />}
                  >
                    View product
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Warehouse information">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Warehouse" value={warehouse?.name ?? warehouseLabel} />
              <DetailField label="Warehouse code" value={warehouse?.warehouseCode} />
              <DetailField label="Address" value={warehouse?.address} />
              <DetailField label="Warehouse ID" value={inventory.warehouseId} />
              {warehouse ? (
                <div className="sm:col-span-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    render={<Link href={ROUTES.warehouseDetail(warehouse.id)} />}
                  >
                    View warehouse
                  </AppButton>
                </div>
              ) : null}
            </dl>
          </SectionCard>

          <EmptyCard
            title="Recent stock movements"
            description="Stock movement history will appear here when the stock movements module is connected."
          />

          <EmptyCard
            title="Procurement history"
            description="Purchase order and receiving history will appear here when the procurement module is connected."
          />

          <EmptyCard
            title="Rental usage"
            description="Rental order allocations and usage will appear here when rental orders are connected."
          />

          <EmptyCard
            title="Dispatch history"
            description="Outbound dispatch records will appear here when the dispatch module is connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status"
            actions={<InventoryStatusBadge isActive={inventory.isActive} />}
          >
            <dl className="space-y-4">
              <DetailField label="Stock status" value={stockStatus.replace("-", " ")} />
              <DetailField label="Created" value={formatDate(inventory.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(inventory.updatedAt)} />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Returns"
            description="Return and inspection history will appear here when the returns module is connected."
          />

          <EmptyCard
            title="Repair"
            description="Repair and maintenance records will appear here when the repair module is connected."
          />

          <EmptyCard
            title="Inventory valuation"
            description="Inventory valuation will appear here when costing data is available from the API."
          />
        </div>
      </div>

      <EditInventoryDialog
        inventory={inventory}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteInventoryDialog
        inventory={inventory}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push(ROUTES.inventory)}
      />

      <ToggleInventoryStatusDialog
        inventory={inventory}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </PageContainer>
  );
}
