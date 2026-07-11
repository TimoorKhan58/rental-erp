"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { DataTableShell, DataPagination } from "@/components/shared";
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
import { matchesDispatchDateRange, STATUS_LABELS } from "../mappers";
import { DISPATCH_STATUSES } from "../types";
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
import type { DispatchResponse } from "../types";

export function DispatchListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    warehouseId,
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
  } = useDispatchListParams();
  const { canCreate, canUpdate, canComplete, canCancel } = useDispatchPermissions();
  const {
    rentalOrderOptions,
    warehouseOptions,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    warehouseLabelById,
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

  const rows = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter((item) => {
      const matchesWarehouse =
        !warehouseId || rentalOrderWarehouseById.get(item.rentalOrderId) === warehouseId;

      return (
        matchesWarehouse &&
        matchesDispatchDateRange(item.dispatchDate, dispatchDateFrom, dispatchDateTo)
      );
    });
  }, [
    data?.items,
    warehouseId,
    dispatchDateFrom,
    dispatchDateTo,
    rentalOrderWarehouseById,
  ]);

  const columns = getDispatchTableColumns({
    params,
    onSort: setSorting,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    warehouseLabelById,
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
    Boolean(warehouseId) ||
    Boolean(dispatchDateFrom) ||
    Boolean(dispatchDateTo);

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

  return (
    <>
      <DataTableShell
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search by dispatch number or address..."
            className="w-full sm:max-w-xs"
            aria-label="Search dispatches"
          />
        }
        filters={
          <>
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
              value={warehouseId ?? "all"}
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
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as DispatchResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {DISPATCH_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
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
          </>
        }
        actions={
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
        }
        emptyState={
          <EmptyState
            title="No dispatches found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first dispatch."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.dispatchesNew}>
                  <EmptyStateActionButton>Create dispatch</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading dispatches..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

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
