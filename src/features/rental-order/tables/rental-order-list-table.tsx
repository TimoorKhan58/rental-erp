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
import { matchesReservationFilter, matchesStartDateRange } from "../mappers";
import {
  RentalOrderReservationFilterChips,
  RentalOrderStatusFilterChips,
} from "../components";
import {
  useRentalOrderFilterOptions,
  useRentalOrderListParams,
  useRentalOrderPermissions,
  useRentalOrders,
} from "../hooks";
import { getRentalOrderTableColumns } from "./rental-order-list-table-columns";
import { CancelRentalOrderDialog } from "../dialogs/cancel-rental-order-dialog";
import { ConfirmRentalOrderDialog } from "../dialogs/confirm-rental-order-dialog";
import { ReserveRentalOrderDialog } from "../dialogs/reserve-rental-order-dialog";
import type { RentalOrderResponse, RentalOrderStatus } from "../types";

type RentalOrderListTableProps = {
  orderStatusCounts?: Partial<Record<"all" | RentalOrderStatus, number>>;
  reservationStatusCounts?: Partial<
    Record<"all" | "not-started" | "partial" | "complete", number>
  >;
};

export function RentalOrderListTable({
  orderStatusCounts,
  reservationStatusCounts,
}: RentalOrderListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    reservationStatus,
    startDateFrom,
    startDateTo,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setCustomerFilter,
    setWarehouseFilter,
    setStatusFilter,
    setReservationFilter,
    setDateRange,
    setSorting,
  } = useRentalOrderListParams();
  const { canCreate, canUpdate, canConfirm, canReserve, canCancel } =
    useRentalOrderPermissions();
  const {
    customerOptions,
    warehouseOptions,
    customerLabelById,
    warehouseLabelById,
    customerNameById,
    warehouseNameById,
  } = useRentalOrderFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useRentalOrders(params);

  const [confirmTarget, setConfirmTarget] = useState<RentalOrderResponse | null>(null);
  const [reserveTarget, setReserveTarget] = useState<RentalOrderResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RentalOrderResponse | null>(null);

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
    return items.filter(
      (item) =>
        matchesReservationFilter(item, reservationStatus) &&
        matchesStartDateRange(item.startDate, startDateFrom, startDateTo),
    );
  }, [data?.items, reservationStatus, startDateFrom, startDateTo]);

  const statusFilterValue = params.status ?? "all";

  const columns = getRentalOrderTableColumns({
    params,
    onSort: setSorting,
    customerLabelById,
    warehouseLabelById,
    customerNameById,
    warehouseNameById,
    canUpdate,
    canConfirm,
    canReserve,
    canCancel,
    onConfirm: setConfirmTarget,
    onReserve: setReserveTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.customerId) ||
    Boolean(params.warehouseId) ||
    Boolean(params.status) ||
    reservationStatus !== "all" ||
    Boolean(startDateFrom) ||
    Boolean(startDateTo);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load rental orders</p>
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
        density="compact"
        toolbar={
          <div className="space-y-3">
            <RentalOrderStatusFilterChips
              value={statusFilterValue}
              onChange={(value) =>
                setStatusFilter(value === "all" ? undefined : value)
              }
              counts={orderStatusCounts}
            />
            <RentalOrderReservationFilterChips
              value={reservationStatus}
              onChange={setReservationFilter}
              counts={reservationStatusCounts}
            />
          </div>
        }
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search orders..."
            className="w-full sm:max-w-xs"
            aria-label="Search rental orders"
          />
        }
        filters={
          <>
            <Select
              value={params.customerId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setCustomerFilter(undefined);
                  return;
                }

                setCustomerFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by customer">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customerOptions.map((option) => (
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
              value={startDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, startDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Rental start date from"
            />
            <Input
              type="date"
              value={startDateTo ?? ""}
              onChange={(event) =>
                setDateRange(startDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Rental start date to"
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
            aria-label="Refresh rental order list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No rental orders found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first rental order."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.rentalOrdersNew}>
                  <EmptyStateActionButton>Create rental order</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading rental orders..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <ConfirmRentalOrderDialog
        order={confirmTarget}
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
          }
        }}
      />

      <ReserveRentalOrderDialog
        order={reserveTarget}
        open={Boolean(reserveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReserveTarget(null);
          }
        }}
      />

      <CancelRentalOrderDialog
        order={cancelTarget}
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
