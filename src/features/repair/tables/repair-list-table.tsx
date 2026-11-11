"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, EmptyStateActionButton } from "@/components/feedback";
import { LoadingState } from "@/components/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { queryKeys } from "@/lib/query";
import { STATUS_LABELS } from "../mappers";
import { RepairMobileList, RepairStatusFilterChips } from "../components";
import {
  useRepairFilterOptions,
  useRepairListParams,
  useRepairPermissions,
  useRepairs,
} from "../hooks";
import { getRepairTableColumns } from "./repair-list-table-columns";
import { CancelRepairDialog } from "../dialogs/cancel-repair-dialog";
import { CompleteRepairDialog } from "../dialogs/complete-repair-dialog";
import { StartRepairDialog } from "../dialogs/start-repair-dialog";
import type { RepairResponse, RepairStatus } from "../types";

type RepairListTableProps = {
  statusCounts?: Partial<Record<"all" | RepairStatus, number>>;
};

export function RepairListTable({ statusCounts }: RepairListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    repairDateFrom,
    repairDateTo,
    technician,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setReturnFilter,
    setProductFilter,
    setWarehouseFilter,
    setStatusFilter,
    setTechnicianFilter,
    setDateRange,
    setSorting,
    clearAllFilters,
  } = useRepairListParams();
  const { canCreate, canUpdate, canStart, canComplete, canCancel } = useRepairPermissions();
  const {
    returnOptions,
    productOptions,
    warehouseOptions,
    returnLabelById,
    productLabelById,
    productNameById,
    warehouseLabelById,
  } = useRepairFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useRepairs(params);

  const [startTarget, setStartTarget] = useState<RepairResponse | null>(null);
  const [completeTarget, setCompleteTarget] = useState<RepairResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RepairResponse | null>(null);
  const [localTechnician, setLocalTechnician] = useState(technician ?? "");

  const handleClearAll = () => {
    setLocalTechnician("");
    clearAllFilters();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localTechnician !== (technician ?? "")) {
        setTechnicianFilter(localTechnician || undefined);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localTechnician, technician, setTechnicianFilter]);

  const rows = useMemo(() => data?.items ?? [], [data?.items]);

  const statusFilterValue = params.status ?? "all";

  const columns = getRepairTableColumns({
    params,
    onSort: setSorting,
    returnLabelById,
    productLabelById,
    productNameById,
    canUpdate,
    canStart,
    canComplete,
    canCancel,
    onStart: setStartTarget,
    onComplete: setCompleteTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.returnId) ||
    Boolean(params.productId) ||
    Boolean(params.warehouseId) ||
    Boolean(params.status) ||
    Boolean(params.technician) ||
    Boolean(params.repairDateFrom) ||
    Boolean(params.repairDateTo);

  const activeFilters = [
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    params.returnId
      ? {
          id: "return",
          label: `Return: ${returnLabelById.get(params.returnId) ?? params.returnId}`,
          onClear: () => setReturnFilter(undefined),
        }
      : null,
    params.productId
      ? {
          id: "product",
          label: `Product: ${productLabelById.get(params.productId) ?? params.productId}`,
          onClear: () => setProductFilter(undefined),
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: `Warehouse: ${warehouseLabelById.get(params.warehouseId) ?? params.warehouseId}`,
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
    params.status
      ? {
          id: "status",
          label: `Status: ${STATUS_LABELS[params.status]}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    params.technician
      ? {
          id: "technician",
          label: `Technician: ${params.technician}`,
          onClear: () => {
            setLocalTechnician("");
            setTechnicianFilter(undefined);
          },
        }
      : null,
    repairDateFrom || repairDateTo
      ? {
          id: "dates",
          label: `Dates: ${repairDateFrom ?? "…"} → ${repairDateTo ?? "…"}`,
          onClear: () => setDateRange(undefined, undefined),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onClear: () => void }>;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load repairs</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No repairs found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Repairs will appear here once created from a completed return with damaged quantity."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={handleClearAll}>
            Clear filters
          </AppButton>
        ) : canCreate ? (
          <Link href={ROUTES.repairsNew}>
            <EmptyStateActionButton>Create repair</EmptyStateActionButton>
          </Link>
        ) : undefined
      }
    />
  );

  return (
    <>
      <div className="space-y-3">
        <RepairStatusFilterChips
          value={statusFilterValue}
          onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
          counts={statusCounts}
        />
        <ActiveFilters filters={activeFilters} onClearAll={handleClearAll} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search repair number, remarks, or technician..."
              className="w-full sm:max-w-xs"
              aria-label="Search repairs by number, remarks, or technician"
            />
            <Select
              value={params.returnId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setReturnFilter(undefined);
                  return;
                }

                setReturnFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by return">
                <SelectValue placeholder="Return" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All returns</SelectItem>
                {returnOptions.map((option) => (
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

            <SearchInput
              value={localTechnician}
              onChange={setLocalTechnician}
              placeholder="Technician"
              className="w-full sm:w-40"
              aria-label="Filter by technician"
            />

            <Input
              type="date"
              value={repairDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, repairDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Repair date from"
            />
            <Input
              type="date"
              value={repairDateTo ?? ""}
              onChange={(event) =>
                setDateRange(repairDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Repair date to"
            />
          </div>
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh repair list"
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
            loadingState={<LoadingState label="Loading repairs..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading repairs..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <RepairMobileList
              rows={rows}
              resolveProductLabel={(productId) =>
                productNameById.get(productId) ??
                productLabelById.get(productId) ??
                productId
              }
              resolveReturnLabel={(returnId) => returnLabelById.get(returnId) ?? returnId}
              canUpdate={canUpdate}
              canStart={canStart}
              canComplete={canComplete}
              canCancel={canCancel}
              onStart={setStartTarget}
              onComplete={setCompleteTarget}
              onCancel={setCancelTarget}
            />
          )}
        </div>

        {data?.meta ? (
          <div className="flex justify-end">
            <DataPagination meta={data.meta} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <StartRepairDialog
        repair={startTarget}
        open={Boolean(startTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStartTarget(null);
          }
        }}
      />

      <CompleteRepairDialog
        repair={completeTarget}
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
          }
        }}
      />

      <CancelRepairDialog
        repair={cancelTarget}
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
      />
    </>
  );
}
