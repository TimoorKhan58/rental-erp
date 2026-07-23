"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BoxesIcon,
  Building2Icon,
  ClockIcon,
  PackageIcon,
  PencilIcon,
  ScaleIcon,
  Trash2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard, EmptyCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useProduct } from "@/features/product/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import { calculateInventoryRecovery, deriveStockStatus } from "../mappers";
import {
  useInventory,
  useInventoryFilterOptions,
  useInventoryPermissions,
  useInventoryRecoveryMaps,
} from "../hooks";
import { InventoryStatusBadge } from "../components/inventory-status-badge";
import { InventoryStockStatusBadge } from "../components/inventory-stock-status-badge";
import { InventoryRecoveryIndicator } from "../components/inventory-recovery-indicator";
import { InventoryStockLevelBar } from "../components/inventory-stock-level-bar";
import { AdjustInventoryDialog } from "../dialogs/adjust-inventory-dialog";
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

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RelatedEntityCard({
  title,
  icon,
  iconClass,
  fields,
  href,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  fields: Array<{ label: string; value: string | null | undefined }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconClass,
            )}
          >
            {icon}
          </div>
          <dl className="grid flex-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <DetailField key={field.label} label={field.label} value={field.value} />
            ))}
          </dl>
        </div>
        {href && linkLabel ? (
          <AppButton
            variant="outline"
            size="sm"
            rightIcon={<ArrowUpRightIcon className="size-3.5" aria-hidden="true" />}
            render={<Link href={href} />}
          >
            {linkLabel}
          </AppButton>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function InventoryDetailPage({ inventoryId }: InventoryDetailPageProps) {
  const router = useRouter();
  const { data: inventory, isLoading, isError, error, refetch } = useInventory(inventoryId);
  const { canUpdate, canDelete, canAdjust } = useInventoryPermissions();
  const { productLabelById, warehouseLabelById, productPricingById } =
    useInventoryFilterOptions();
  const { productRecoveryById } = useInventoryRecoveryMaps();
  const { data: product } = useProduct(inventory?.productId ?? "");
  const { data: warehouse } = useWarehouse(inventory?.warehouseId ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const recoveryMetrics = useMemo(() => {
    if (!inventory) {
      return null;
    }

    return calculateInventoryRecovery({
      quantityOnHand: inventory.quantityOnHand,
      reservedQuantity: inventory.reservedQuantity,
      pricing: productPricingById.get(inventory.productId),
      productRecovery: productRecoveryById.get(inventory.productId),
    });
  }, [inventory, productPricingById, productRecoveryById]);

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
  const productName = product?.name ?? productLabel;
  const warehouseLabel =
    warehouseLabelById.get(inventory.warehouseId) ?? inventory.warehouseId;
  const warehouseName = warehouse?.name ?? warehouseLabel;
  const stockStatus = deriveStockStatus(inventory);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={productName}
        description={warehouseName}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Inventory", href: ROUTES.inventory },
          { label: productName },
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
            {canAdjust ? (
              <AppButton
                variant="outline"
                leftIcon={<ScaleIcon className="size-4" aria-hidden="true" />}
                onClick={() => setAdjustOpen(true)}
              >
                Adjust stock
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

      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <InventoryStockStatusBadge status={stockStatus} />
                <InventoryStatusBadge isActive={inventory.isActive} />
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated {formatDateTime(inventory.updatedAt)}
              </p>
            </div>
            {recoveryMetrics ? (
              <InventoryRecoveryIndicator metrics={recoveryMetrics} className="min-w-[9rem]" />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="On hand"
              value={inventory.quantityOnHand.toLocaleString()}
              hint="Total units in warehouse"
              icon={<BoxesIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Reserved"
              value={inventory.reservedQuantity.toLocaleString()}
              hint="Allocated to active reservations"
            />
            <MetricTile
              label="Available"
              value={inventory.availableQuantity.toLocaleString()}
              hint="Ready for allocation"
            />
            <MetricTile
              label="Reorder level"
              value={inventory.minimumStock.toLocaleString()}
              hint="Minimum stock threshold"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Stock level</span>
              <span className="tabular-nums text-muted-foreground">
                {inventory.availableQuantity.toLocaleString()} available of{" "}
                {inventory.quantityOnHand.toLocaleString()} on hand
              </span>
            </div>
            <InventoryStockLevelBar
              available={inventory.availableQuantity}
              minimum={inventory.minimumStock}
              maximum={inventory.maximumStock}
              onHand={inventory.quantityOnHand}
              size="md"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RelatedEntityCard
            title="Product"
            icon={<PackageIcon className="size-5" aria-hidden="true" />}
            iconClass="bg-success-muted text-success"
            fields={[
              { label: "Name", value: product?.name ?? productLabel },
              { label: "Product code", value: product?.productCode },
              { label: "Unit", value: product?.unit },
            ]}
            href={product ? ROUTES.productDetail(product.id) : undefined}
            linkLabel="View product"
          />

          <RelatedEntityCard
            title="Warehouse"
            icon={<Building2Icon className="size-5" aria-hidden="true" />}
            iconClass="bg-primary/12 text-primary"
            fields={[
              { label: "Name", value: warehouse?.name ?? warehouseLabel },
              { label: "Warehouse code", value: warehouse?.warehouseCode },
              { label: "Address", value: warehouse?.address },
            ]}
            href={warehouse ? ROUTES.warehouseDetail(warehouse.id) : undefined}
            linkLabel="View warehouse"
          />

          <SectionCard title="Thresholds & limits">
            <dl className="grid gap-4 sm:grid-cols-3">
              <DetailField label="Reorder level" value={inventory.minimumStock} />
              <DetailField label="Maximum stock" value={inventory.maximumStock ?? null} />
              <DetailField
                label="Utilization"
                value={
                  inventory.maximumStock
                    ? `${Math.round((inventory.quantityOnHand / inventory.maximumStock) * 100)}%`
                    : "—"
                }
              />
            </dl>
          </SectionCard>

          <EmptyCard
            title="Activity history"
            description="Stock movements, procurement, rentals, and dispatch records will appear here as modules are connected."
          />
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Record details"
            actions={<InventoryStatusBadge isActive={inventory.isActive} />}
          >
            <dl className="space-y-4">
              <DetailField
                label="Stock status"
                value={stockStatus.replace("-", " ")}
              />
              <DetailField
                label="Record status"
                value={inventory.isActive ? "Active" : "Inactive"}
              />
              <DetailField label="Created" value={formatDate(inventory.createdAt)} />
              <DetailField label="Last updated" value={formatDateTime(inventory.updatedAt)} />
            </dl>
          </SectionCard>

          {recoveryMetrics?.hasCostData ? (
            <SectionCard title="Cost recovery">
              <dl className="space-y-4">
                <DetailField
                  label="Recovery phase"
                  value={recoveryMetrics.phaseLabel}
                />
                <DetailField
                  label="Recovered amount"
                  value={recoveryMetrics.recoveredAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                />
                <DetailField
                  label="Total cost basis"
                  value={recoveryMetrics.totalCost.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                />
                {recoveryMetrics.isOverRecovered ? (
                  <DetailField
                    label="Surplus beyond cost"
                    value={recoveryMetrics.surplusAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  />
                ) : null}
              </dl>
            </SectionCard>
          ) : (
            <SectionCard
              title="Cost recovery"
              description="Recovery metrics require product cost data."
            >
              <p className="text-sm text-muted-foreground">
                Add replacement cost to the product to track purchase cost recovery.
              </p>
            </SectionCard>
          )}

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(inventory.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">{formatDateTime(inventory.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <EditInventoryDialog
        inventory={inventory}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AdjustInventoryDialog
        inventory={inventory}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
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
