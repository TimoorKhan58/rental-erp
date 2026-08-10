"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, LoadingState } from "@/components/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query";
import { AssetStatusFilterChips } from "../components";
import {
  useAssetFilterOptions,
  useAssetListParams,
  useAssetPermissions,
  useAssets,
} from "../hooks";
import { getAssetTableColumns } from "./asset-list-table-columns";
import {
  DisposeAssetDialog,
  MaintenanceAssetDialog,
  TransferAssetDialog,
} from "../dialogs";
import type { AssetResponse, AssetStatus } from "../types";

type AssetListTableProps = {
  statusCounts?: Partial<Record<"all" | AssetStatus, number>>;
};

export function AssetListTable({ statusCounts }: AssetListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setStatusFilter,
    setCategoryFilter,
    setWarehouseFilter,
    setSorting,
  } = useAssetListParams();
  const { canUpdate, canTransfer, canDispose, canMaintenance } =
    useAssetPermissions();
  const { categoryOptions, warehouseOptions, categoryLabelById, warehouseLabelById } =
    useAssetFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useAssets(params);

  const [transferTarget, setTransferTarget] = useState<AssetResponse | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<AssetResponse | null>(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState<AssetResponse | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = getAssetTableColumns({
    params,
    onSort: setSorting,
    categoryLabelById,
    warehouseLabelById,
    canUpdate,
    canTransfer,
    canDispose,
    canMaintenance,
    onTransfer: setTransferTarget,
    onDispose: setDisposeTarget,
    onMaintenance: setMaintenanceTarget,
  });

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.status) ||
    Boolean(params.categoryId) ||
    Boolean(params.warehouseId);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load assets</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <>
      <DataTableShell
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        toolbar={
          <AssetStatusFilterChips
            value={params.status ?? "all"}
            onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
            counts={statusCounts}
          />
        }
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search assets..."
            className="w-full sm:max-w-xs"
            aria-label="Search assets"
          />
        }
        filters={
          <>
            <Select
              value={params.categoryId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setCategoryFilter(undefined);
                  return;
                }
                setCategoryFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.warehouseId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setWarehouseFilter(undefined);
                  return;
                }
                setWarehouseFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by warehouse">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouseOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        actions={
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: queryKeys.assets.lists() });
              void refetch();
            }}
            loading={isFetching && !isLoading}
            aria-label="Refresh asset list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No assets found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Assets will appear here once registered."
            }
          />
        }
        loadingState={<LoadingState label="Loading assets..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <TransferAssetDialog
        asset={transferTarget}
        open={Boolean(transferTarget)}
        onOpenChange={(open) => {
          if (!open) setTransferTarget(null);
        }}
      />
      <DisposeAssetDialog
        asset={disposeTarget}
        open={Boolean(disposeTarget)}
        onOpenChange={(open) => {
          if (!open) setDisposeTarget(null);
        }}
      />
      <MaintenanceAssetDialog
        asset={maintenanceTarget}
        open={Boolean(maintenanceTarget)}
        onOpenChange={(open) => {
          if (!open) setMaintenanceTarget(null);
        }}
      />
    </>
  );
}
