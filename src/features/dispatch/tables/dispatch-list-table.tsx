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
import { DispatchMobileList, DispatchStatusFilterChips } from "../components";
import {
  useDispatchFilterOptions,
  useDispatchListParams,
  useDispatchPermissions,
  useDispatches,
} from "../hooks";
import { getDispatchTableColumns } from "./dispatch-list-table-columns";
import { CancelDispatchDialog } from "../dialogs/cancel-dispatch-dialog";
import { CompleteDispatchDialog } from "../dialogs/complete-dispatch-dialog";
import { MarkReadyDispatchDialog } from "../dialogs/mark-ready-dispatch-dialog";
import type { DispatchResponse, DispatchStatus } from "../types";

type DispatchListTableProps = {
  statusCounts?: Partial<Record<"all" | DispatchStatus, number>>;
};

export function DispatchListTable({ statusCounts }: DispatchListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    dispatchDateFrom,
    dispatchDateTo,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setRentalOrderFilter,
    setWarehouseFilter,
    setStatusFilter,
    setDateRange,
    setSorting,
    clearAllFilters,
  } = useDispatchListParams();
  const { canCreate, canUpdate, canComplete, canCancel } = useDispatchPermissions();
  const {
    rentalOrderOptions,
    warehouseOptions,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    rentalOrderCustomerById,
    customerNameById,
    warehouseLabelById,
    warehouseNameById,
  } = useDispatchFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useDispatches(params);

  const [markReadyTarget, setMarkReadyTarget] = useState<DispatchResponse | null>(null);
  const [completeTarget, setCompleteTarget] = useState<DispatchResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DispatchResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const rows = useMemo(() => data?.items ?? [], [data?.items]);

  const statusFilterValue = params.status ?? "all";

  const columns = getDispatchTableColumns({
    params,
    onSort: setSorting,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    rentalOrderCustomerById,
    customerNameById,
    warehouseLabelById,
    warehouseNameById,
    canUpdate,
    canComplete,
    canCancel,
    onMarkReady: setMarkReadyTarget,
    onComplete: setCompleteTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.rentalOrderId) ||
    Boolean(params.status) ||
    Boolean(params.warehouseId) ||
    Boolean(params.dispatchDateFrom) ||
    Boolean(params.dispatchDateTo);

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
    params.rentalOrderId
      ? {
          id: "order",
          label: `Order: ${rentalOrderLabelById.get(params.rentalOrderId) ?? params.rentalOrderId}`,
          onClear: () => setRentalOrderFilter(undefined),
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
    dispatchDateFrom || dispatchDateTo
      ? {
          id: "dates",
          label: `Dates: ${dispatchDateFrom ?? "…"} → ${dispatchDateTo ?? "…"}`,
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
        <p className="text-sm font-medium">Failed to load dispatches</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No dispatches found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Dispatches will appear here once created."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={clearAllFilters}>
            Clear filters
          </AppButton>
        ) : canCreate ? (
          <Link href={ROUTES.dispatchesNew}>
            <EmptyStateActionButton>Create dispatch</EmptyStateActionButton>
          </Link>
        ) : undefined
      }
    />
  );

  const resolveCustomerName = (rentalOrderId: string) => {
    const customerId = rentalOrderCustomerById.get(rentalOrderId);
    if (!customerId) {
      return "Unknown customer";
    }

    return customerNameById.get(customerId) ?? "Unknown customer";
  };

  return (
    <>
      <div className="space-y-3">
        <DispatchStatusFilterChips
          value={statusFilterValue}
          onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
          counts={statusCounts}
        />
        <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search dispatch number, address, or remarks..."
              className="w-full sm:max-w-xs"
              aria-label="Search dispatches by number, address, or remarks"
            />
            <Select
              value={params.rentalOrderId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setRentalOrderFilter(undefined);
                  return;
                }

                setRentalOrderFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by rental order">
                <SelectValue placeholder="Rental order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rental orders</SelectItem>
                {rentalOrderOptions.map((option) => (
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

            <Input
              type="date"
              value={dispatchDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, dispatchDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Dispatch date from"
            />
            <Input
              type="date"
              value={dispatchDateTo ?? ""}
              onChange={(event) =>
                setDateRange(dispatchDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Dispatch date to"
            />
          </div>
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh dispatch list"
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
            loadingState={<LoadingState label="Loading dispatches..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading dispatches..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <DispatchMobileList
              rows={rows}
              resolveOrderLabel={(rentalOrderId) =>
                rentalOrderLabelById.get(rentalOrderId) ?? rentalOrderId
              }
              resolveCustomerName={resolveCustomerName}
              canUpdate={canUpdate}
              canComplete={canComplete}
              canCancel={canCancel}
              onMarkReady={setMarkReadyTarget}
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

      <MarkReadyDispatchDialog
        dispatch={markReadyTarget}
        open={Boolean(markReadyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setMarkReadyTarget(null);
          }
        }}
      />

      <CompleteDispatchDialog
        dispatch={completeTarget}
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
          }
        }}
      />

      <CancelDispatchDialog
        dispatch={cancelTarget}
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
