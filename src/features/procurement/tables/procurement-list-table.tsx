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
import { matchesOrderDateRange } from "../mappers";
import { PURCHASE_ORDER_STATUSES } from "../types";
import { STATUS_LABELS } from "../mappers";
import {
  useProcurementFilterOptions,
  useProcurementListParams,
  useProcurementPermissions,
  useProcurements,
} from "../hooks";
import { getProcurementTableColumns } from "./procurement-list-table-columns";
import { ApproveProcurementDialog } from "../dialogs/approve-procurement-dialog";
import { CancelProcurementDialog } from "../dialogs/cancel-procurement-dialog";
import { ReceiveProcurementDialog } from "../dialogs/receive-procurement-dialog";
import type { ProcurementResponse } from "../types";

export function ProcurementListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    orderDateFrom,
    orderDateTo,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setSupplierFilter,
    setWarehouseFilter,
    setStatusFilter,
    setDateRange,
    setSorting,
  } = useProcurementListParams();
  const { canCreate, canUpdate, canApprove, canReceive, canCancel } =
    useProcurementPermissions();
  const { supplierOptions, warehouseOptions, supplierLabelById, warehouseLabelById } =
    useProcurementFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useProcurements(params);

  const [approveTarget, setApproveTarget] = useState<ProcurementResponse | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<ProcurementResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ProcurementResponse | null>(null);

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
    return items.filter((item) =>
      matchesOrderDateRange(item.orderDate, orderDateFrom, orderDateTo),
    );
  }, [data?.items, orderDateFrom, orderDateTo]);

  const columns = getProcurementTableColumns({
    params,
    onSort: setSorting,
    supplierLabelById,
    warehouseLabelById,
    canUpdate,
    canApprove,
    canReceive,
    canCancel,
    onApprove: setApproveTarget,
    onReceive: setReceiveTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.supplierId) ||
    Boolean(params.warehouseId) ||
    Boolean(params.status) ||
    Boolean(orderDateFrom) ||
    Boolean(orderDateTo);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load purchase orders</p>
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
            placeholder="Search by PO number or remarks..."
            className="w-full sm:max-w-xs"
            aria-label="Search purchase orders"
          />
        }
        filters={
          <>
            <Select
              value={params.supplierId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setSupplierFilter(undefined);
                  return;
                }

                setSupplierFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by supplier">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {supplierOptions.map((option) => (
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

            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as ProcurementResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PURCHASE_ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={orderDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, orderDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Order date from"
            />
            <Input
              type="date"
              value={orderDateTo ?? ""}
              onChange={(event) =>
                setDateRange(orderDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Order date to"
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
            aria-label="Refresh purchase order list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No purchase orders found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first purchase order."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.procurementsNew}>
                  <EmptyStateActionButton>Create purchase order</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading purchase orders..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <ApproveProcurementDialog
        procurement={approveTarget}
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
          }
        }}
      />

      <ReceiveProcurementDialog
        procurement={receiveTarget}
        open={Boolean(receiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReceiveTarget(null);
          }
        }}
      />

      <CancelProcurementDialog
        procurement={cancelTarget}
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
