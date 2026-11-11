"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
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
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { ROUTES } from "@/config/routes";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { useProduct } from "@/features/product/hooks";
import { useWarehouse } from "@/features/warehouse/hooks";
import {
  calculateInventoryRecovery,
  deriveInventoryPresentationChips,
  deriveRelatedOperationalAttention,
  deriveStockStatus,
  needsInventoryAttention,
} from "../mappers";
import {
  useInventory,
  useInventoryFilterOptions,
  useInventoryPermissions,
  useInventoryRecoveryMaps,
  useInventoryRelatedData,
} from "../hooks";
import { InventoryStatusBadge } from "../components/inventory-status-badge";
import { InventoryPresentationChipBadge } from "../components/inventory-presentation-chip";
import { InventoryQuantityBreakdown } from "../components/inventory-quantity-breakdown";
import { InventoryRecoveryIndicator } from "../components/inventory-recovery-indicator";
import { InventoryStockLevelBar } from "../components/inventory-stock-level-bar";
import { InventoryDetailSections } from "../components/inventory-detail-sections";
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
              "flex size-9 shrink-0 items-center justify-center rounded-md",
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
  const relatedData = useInventoryRelatedData(inventory);

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

  const relatedAttention = useMemo(
    () =>
      deriveRelatedOperationalAttention({
        maintenances: relatedData.maintenances,
        repairs: relatedData.repairs,
      }),
    [relatedData.maintenances, relatedData.repairs],
  );

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
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
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
  const presentationChips = deriveInventoryPresentationChips(inventory);
  const attention = needsInventoryAttention(inventory);

  return (
    <PageContainer className="space-y-5">
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
            {canUpdate ? (
              <AppButton
                variant="outline"
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                onClick={() => setEditOpen(true)}
              >
                Edit thresholds
              </AppButton>
            ) : null}
            {canAdjust ? (
              <AppButton
                className="bg-brand text-brand-foreground hover:bg-brand/90"
                leftIcon={<ScaleIcon className="size-4" aria-hidden="true" />}
                onClick={() => setAdjustOpen(true)}
              >
                Adjust stock
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

      <section
        className={cn(
          "space-y-5 rounded-md border border-border bg-card p-4 sm:p-5",
          attention && stockStatus === "out-of-stock" && "border-l-[3px] border-l-destructive",
          attention && stockStatus === "low-stock" && "border-l-[3px] border-l-warning",
        )}
        aria-label="Inventory stock overview"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {presentationChips.map((chip) => (
                <InventoryPresentationChipBadge
                  key={chip.id}
                  label={chip.label}
                  tone={chip.tone}
                />
              ))}
              {relatedAttention.map((signal) => (
                <InventoryPresentationChipBadge
                  key={signal.id}
                  label={signal.label}
                  tone={signal.tone}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated {formatDateTime(inventory.updatedAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              On-hand corrections use Adjust stock (ADJUSTMENT movement). Thresholds and
              active status use Edit thresholds — stock quantities are not edited there.
            </p>
          </div>
          {recoveryMetrics ? (
            <InventoryRecoveryIndicator metrics={recoveryMetrics} className="min-w-[9rem]" />
          ) : null}
        </div>

        <InventoryQuantityBreakdown
          quantityOnHand={inventory.quantityOnHand}
          reservedQuantity={inventory.reservedQuantity}
          availableQuantity={inventory.availableQuantity}
          size="detail"
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">Availability vs thresholds</span>
            <span className="tabular-nums text-muted-foreground">
              {inventory.availableQuantity.toLocaleString()} available · reorder{" "}
              {inventory.minimumStock.toLocaleString()}
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
      </section>

      <div className="app-grid">
        <div className="min-w-0 space-y-5 sm:col-span-6 lg:col-span-8">
          <RelatedEntityCard
            title="Product"
            icon={<PackageIcon className="size-4" aria-hidden="true" />}
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
            icon={<Building2Icon className="size-4" aria-hidden="true" />}
            iconClass="bg-primary/10 text-primary"
            fields={[
              { label: "Name", value: warehouse?.name ?? warehouseLabel },
              { label: "Warehouse code", value: warehouse?.warehouseCode },
              { label: "Address", value: warehouse?.address },
            ]}
            href={warehouse ? ROUTES.warehouseDetail(warehouse.id) : undefined}
            linkLabel="View warehouse"
          />

          <SectionCard
            title="Thresholds & limits"
            description="Edited via Edit thresholds. Does not change on-hand or committed quantities."
          >
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

          <InventoryDetailSections
            inventory={inventory}
            stockMovements={relatedData.stockMovements}
            stockMovementTotal={relatedData.stockMovementTotal}
            maintenances={relatedData.maintenances}
            repairs={relatedData.repairs}
            auditLogs={relatedData.auditLogs}
            permissions={relatedData.permissions}
            isLoading={relatedData.isLoading}
          />
        </div>

        <div className="min-w-0 space-y-5 sm:col-span-6 lg:col-span-4">
          <SectionCard
            title="Record details"
            actions={<InventoryStatusBadge isActive={inventory.isActive} />}
          >
            <dl className="space-y-4">
              <DetailField label="Operational status" value={presentationChips[0]?.label} />
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
                <DetailField label="Recovery phase" value={recoveryMetrics.phaseLabel} />
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
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDateTime(inventory.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
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
