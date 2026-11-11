"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell } from "@/components/shared";
import { DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState } from "@/components/feedback";
import { LoadingState } from "@/components/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query";
import { matchesStockStatusFilter } from "../mappers";
import {
  InventoryActiveFilters,
  InventoryMobileList,
  InventoryStockFilterChips,
} from "../components";
import {
  useInventoryFilterOptions,
  useInventoryList,
  useInventoryListParams,
  useInventoryPermissions,
} from "../hooks";
import { getInventoryTableColumns } from "./inventory-table-columns";
import { AdjustInventoryDialog } from "../dialogs/adjust-inventory-dialog";
import { CreateInventoryDialog } from "../dialogs/create-inventory-dialog";
import { EditInventoryDialog } from "../dialogs/edit-inventory-dialog";
import { DeleteInventoryDialog } from "../dialogs/delete-inventory-dialog";
import { ToggleInventoryStatusDialog } from "../dialogs/toggle-inventory-status-dialog";
import type { InventoryResponse } from "../types";

type InventoryListTableProps = {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  stockStatusCounts?: Partial<
    Record<"all" | "in-stock" | "low-stock" | "out-of-stock" | "overstock", number>
  >;
};

export function InventoryListTable({
  createOpen: createOpenProp,
  onCreateOpenChange,
  stockStatusCounts,
}: InventoryListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    stockStatus,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setProductFilter,
    setWarehouseFilter,
    setStatusFilter,
    setStockStatusFilter,
    setSorting,
    clearAllFilters,
  } = useInventoryListParams();
  const { canCreate, canUpdate, canDelete, canAdjust } = useInventoryPermissions();
  const {
    productOptions,
    warehouseOptions,
    productLabelById,
    warehouseLabelById,
    productNameById,
    warehouseNameById,
  } = useInventoryFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useInventoryList(params);

  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const createOpen = createOpenProp ?? internalCreateOpen;
  const setCreateOpen = onCreateOpenChange ?? setInternalCreateOpen;

  const [editTarget, setEditTarget] = useState<InventoryResponse | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<InventoryResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((item) => matchesStockStatusFilter(item, stockStatus));
  }, [data?.items, stockStatus]);

  const toEnglishProductName = (name: string) => {
    const separator = name.indexOf(" / ");
    return separator === -1 ? name : name.slice(0, separator).trim();
  };

  const resolveProductName = (productId: string) =>
    toEnglishProductName(
      productNameById.get(productId) ?? productLabelById.get(productId) ?? productId,
    );

  const resolveWarehouseName = (warehouseId: string) =>
    warehouseNameById.get(warehouseId) ?? warehouseLabelById.get(warehouseId) ?? warehouseId;

  const columns = getInventoryTableColumns({
    params,
    onSort: setSorting,
    productLabelById,
    warehouseLabelById,
    productNameById,
    warehouseNameById,
    canUpdate,
    canDelete,
    canAdjust,
    onEdit: setEditTarget,
    onAdjust: setAdjustTarget,
    onDelete: setDeleteTarget,
    onToggleStatus: setStatusTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.productId) ||
    Boolean(params.warehouseId) ||
    params.isActive !== undefined ||
    stockStatus !== "all";

  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; onClear: () => void }> = [];
    const productLabel = (productId: string) =>
      toEnglishProductName(
        productNameById.get(productId) ?? productLabelById.get(productId) ?? productId,
      );
    const warehouseLabel = (warehouseId: string) =>
      warehouseNameById.get(warehouseId) ??
      warehouseLabelById.get(warehouseId) ??
      warehouseId;

    if (params.search) {
      filters.push({
        id: "search",
        label: `Search: ${params.search}`,
        onClear: () => {
          setLocalSearch("");
          setSearch("");
        },
      });
    }

    if (params.warehouseId) {
      filters.push({
        id: "warehouse",
        label: `Warehouse: ${warehouseLabel(params.warehouseId)}`,
        onClear: () => setWarehouseFilter(undefined),
      });
    }

    if (params.productId) {
      filters.push({
        id: "product",
        label: `Product: ${productLabel(params.productId)}`,
        onClear: () => setProductFilter(undefined),
      });
    }

    if (params.isActive !== undefined) {
      filters.push({
        id: "status",
        label: params.isActive ? "Active only" : "Inactive only",
        onClear: () => setStatusFilter(undefined),
      });
    }

    if (stockStatus !== "all") {
      const stockLabels: Record<string, string> = {
        "in-stock": "Available",
        "low-stock": "Shortage",
        "out-of-stock": "Out",
        overstock: "Overstock",
      };
      filters.push({
        id: "stockStatus",
        label: `Stock: ${stockLabels[stockStatus] ?? stockStatus}`,
        onClear: () => setStockStatusFilter("all"),
      });
    }

    return filters;
  }, [
    params.search,
    params.warehouseId,
    params.productId,
    params.isActive,
    stockStatus,
    setLocalSearch,
    setSearch,
    setWarehouseFilter,
    setProductFilter,
    setStatusFilter,
    setStockStatusFilter,
    productNameById,
    productLabelById,
    warehouseNameById,
    warehouseLabelById,
  ]);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load inventory</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No inventory records found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Inventory records will appear when stock is assigned to warehouses."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={clearAllFilters}>
            Clear filters
          </AppButton>
        ) : canCreate ? (
          <AppButton onClick={() => setCreateOpen(true)}>Create inventory record</AppButton>
        ) : undefined
      }
    />
  );

  const filterControls = (
    <>
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

      <Select
        value={params.productId ?? "all"}
        onValueChange={(value) => {
          if (!value || value === "all") {
            setProductFilter(undefined);
            return;
          }

          setProductFilter(value);
        }}
      >
        <SelectTrigger className="w-full sm:w-48" aria-label="Filter by product">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {productOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={
          params.isActive === undefined ? "all" : params.isActive ? "active" : "inactive"
        }
        onValueChange={(value) => {
          if (value === "all") {
            setStatusFilter(undefined);
            return;
          }

          setStatusFilter(value === "active");
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by record status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  return (
    <>
      <div className="space-y-3">
        <InventoryStockFilterChips
          value={stockStatus}
          onChange={setStockStatusFilter}
          counts={stockStatusCounts}
        />

        <InventoryActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search by product or warehouse name or code..."
              className="w-full sm:max-w-xs"
              aria-label="Search inventory by product or warehouse name or code"
            />
            {filterControls}
          </div>
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh inventory list"
          >
            Refresh
          </AppButton>
        </div>

        <div className="hidden md:block">
          <DataTableShell
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            density="compact"
            emptyState={emptyState}
            loadingState={<LoadingState label="Loading inventory..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading inventory..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <InventoryMobileList
              rows={rows}
              resolveProductName={resolveProductName}
              resolveWarehouseName={resolveWarehouseName}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canAdjust={canAdjust}
              onEdit={setEditTarget}
              onAdjust={setAdjustTarget}
              onDelete={setDeleteTarget}
              onToggleStatus={setStatusTarget}
            />
          )}
        </div>

        {data?.meta ? (
          <div className="flex justify-end">
            <DataPagination meta={data.meta} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <CreateInventoryDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditInventoryDialog
        inventory={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
      />

      <AdjustInventoryDialog
        inventory={adjustTarget}
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustTarget(null);
          }
        }}
      />

      <DeleteInventoryDialog
        inventory={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      />

      <ToggleInventoryStatusDialog
        inventory={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
      />
    </>
  );
}
