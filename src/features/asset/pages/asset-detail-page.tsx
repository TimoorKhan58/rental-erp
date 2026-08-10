"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/design-system/card";
import { AppButton } from "@/components/design-system/button";
import { LoadingState } from "@/components/feedback";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  canAddMaintenance,
  canDisposeAsset,
  canEditAsset,
  canTransferAsset,
  parseMoney,
} from "../mappers";
import {
  useAsset,
  useAssetFilterOptions,
  useAssetPermissions,
} from "../hooks";
import { AssetStatusBadge } from "../components";
import {
  DisposeAssetDialog,
  MaintenanceAssetDialog,
  TransferAssetDialog,
} from "../dialogs";

type AssetDetailPageProps = {
  assetId: string;
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
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AssetDetailPage({ assetId }: AssetDetailPageProps) {
  const { data: asset, isLoading, isError, error, refetch } = useAsset(assetId);
  const { canUpdate, canTransfer, canDispose, canMaintenance } =
    useAssetPermissions();
  const {
    categoryLabelById,
    warehouseLabelById,
    vendorLabelById,
    employeeLabelById,
  } = useAssetFilterOptions();

  const [transferOpen, setTransferOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const labels = useMemo(() => {
    if (!asset) return null;
    return {
      category: categoryLabelById.get(asset.categoryId) ?? asset.categoryId,
      warehouse: warehouseLabelById.get(asset.warehouseId) ?? asset.warehouseId,
      vendor: asset.vendorId
        ? (vendorLabelById.get(asset.vendorId) ?? asset.vendorId)
        : null,
      employee: asset.assignedEmployeeId
        ? (employeeLabelById.get(asset.assignedEmployeeId) ??
          asset.assignedEmployeeId)
        : null,
    };
  }, [asset, categoryLabelById, warehouseLabelById, vendorLabelById, employeeLabelById]);

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading asset details..." />
      </PageContainer>
    );
  }

  if (isError || !asset || !labels) {
    return (
      <PageContainer>
        <div
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">Asset not found</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "The requested asset could not be loaded."}
          </p>
          <div className="flex gap-2">
            <AppButton variant="outline" onClick={() => void refetch()}>
              Try again
            </AppButton>
            <AppButton variant="outline" render={<Link href={ROUTES.assets} />}>
              Back to list
            </AppButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  const transfers = asset.transfers ?? [];
  const maintenanceHistory = asset.maintenanceHistory ?? [];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={asset.assetCode}
        description={`${asset.name} · ${labels.category}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Assets", href: ROUTES.assets },
          { label: asset.assetCode },
        ]}
        actions={
          <>
            <AppButton
              variant="outline"
              leftIcon={<ArrowLeftIcon className="size-4" aria-hidden="true" />}
              render={<Link href={ROUTES.assets} />}
            >
              Back
            </AppButton>
            {canUpdate && canEditAsset(asset.status) ? (
              <AppButton
                leftIcon={<PencilIcon className="size-4" aria-hidden="true" />}
                render={<Link href={ROUTES.assetEdit(asset.id)} />}
              >
                Edit
              </AppButton>
            ) : null}
            {canTransfer && canTransferAsset(asset.status) ? (
              <AppButton
                leftIcon={<ArrowRightLeftIcon className="size-4" aria-hidden="true" />}
                onClick={() => setTransferOpen(true)}
              >
                Transfer
              </AppButton>
            ) : null}
            {canMaintenance && canAddMaintenance(asset.status) ? (
              <AppButton
                variant="outline"
                leftIcon={<WrenchIcon className="size-4" aria-hidden="true" />}
                onClick={() => setMaintenanceOpen(true)}
              >
                Maintenance
              </AppButton>
            ) : null}
            {canDispose && canDisposeAsset(asset.status) ? (
              <AppButton
                variant="destructive"
                leftIcon={<Trash2Icon className="size-4" aria-hidden="true" />}
                onClick={() => setDisposeOpen(true)}
              >
                Dispose
              </AppButton>
            ) : null}
          </>
        }
      />

      <Card className="overflow-hidden border-border/60 shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <AssetStatusBadge status={asset.status} />
              <p className="text-sm text-muted-foreground">
                Purchased {formatDate(asset.purchaseDate)} · Last updated{" "}
                {formatDateTime(asset.updatedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current book value
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(parseMoney(asset.currentBookValue))}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Purchase cost"
              value={formatCurrency(parseMoney(asset.purchaseCost))}
              hint={`Residual ${formatCurrency(parseMoney(asset.residualValue))}`}
              icon={<CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Useful life"
              value={`${asset.usefulLifeMonths} mo`}
              hint="Depreciation period"
              icon={<ClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Warehouse"
              value={labels.warehouse}
              hint="Current location"
              icon={<MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
            <MetricTile
              label="Serial"
              value={asset.serialNumber ?? "—"}
              hint="Manufacturer serial"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Asset details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Name" value={asset.name} />
              <DetailField label="Category" value={labels.category} />
              <DetailField label="Warehouse" value={labels.warehouse} />
              <DetailField label="Vendor" value={labels.vendor} />
              <DetailField label="Assigned employee" value={labels.employee} />
              <DetailField label="Serial number" value={asset.serialNumber} />
            </dl>
          </SectionCard>

          {asset.notes ? (
            <SectionCard title="Notes">
              <p className="text-sm text-muted-foreground">{asset.notes}</p>
            </SectionCard>
          ) : null}

          {asset.status === "DISPOSED" ? (
            <SectionCard title="Disposal">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label="Disposal date"
                  value={asset.disposalDate ? formatDate(asset.disposalDate) : null}
                />
                <DetailField
                  label="Disposal amount"
                  value={
                    asset.disposalAmount
                      ? formatCurrency(parseMoney(asset.disposalAmount))
                      : null
                  }
                />
                <DetailField label="Reason" value={asset.disposalReason} />
              </dl>
            </SectionCard>
          ) : null}

          <SectionCard title="Transfer history">
            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transfers recorded.</p>
            ) : (
              <ul className="space-y-3">
                {transfers.map((transfer) => (
                  <li
                    key={transfer.id}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {formatDate(transfer.transferDate)} ·{" "}
                      {warehouseLabelById.get(transfer.fromWarehouseId) ??
                        transfer.fromWarehouseId}{" "}
                      →{" "}
                      {warehouseLabelById.get(transfer.toWarehouseId) ??
                        transfer.toWarehouseId}
                    </p>
                    {transfer.reason ? (
                      <p className="text-muted-foreground">{transfer.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Maintenance history">
            {maintenanceHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance records.</p>
            ) : (
              <ul className="space-y-3">
                {maintenanceHistory.map((record) => (
                  <li
                    key={record.id}
                    className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {formatDate(record.serviceDate)}
                          {record.vendor ? ` · ${record.vendor}` : ""}
                        </p>
                        <p className="text-muted-foreground">{record.description}</p>
                      </div>
                      <span className="shrink-0 tabular-nums font-medium">
                        {formatCurrency(parseMoney(record.cost))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Status"
            actions={<AssetStatusBadge status={asset.status} />}
          >
            <p className="text-sm text-muted-foreground">
              Active assets can be transferred, maintained, or disposed. Disposed
              assets are read-only.
            </p>
          </SectionCard>

          <SectionCard title="Timeline">
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(asset.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <ClockIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(asset.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <TransferAssetDialog
        asset={asset}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
      <DisposeAssetDialog
        asset={asset}
        open={disposeOpen}
        onOpenChange={setDisposeOpen}
      />
      <MaintenanceAssetDialog
        asset={asset}
        open={maintenanceOpen}
        onOpenChange={setMaintenanceOpen}
      />
    </PageContainer>
  );
}
