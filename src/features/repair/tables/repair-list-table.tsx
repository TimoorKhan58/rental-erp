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
import {
  matchesRepairDateRange,
  matchesTechnicianFilter,
  STATUS_LABELS,
} from "../mappers";
import { REPAIR_STATUSES } from "../types";
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
import type { RepairResponse } from "../types";

export function RepairListTable() {
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
  } = useRepairListParams();
  const { canCreate, canUpdate, canStart, canComplete, canCancel } = useRepairPermissions();
  const {
    returnOptions,
    productOptions,
    warehouseOptions,
    returnLabelById,
    productLabelById,
  } = useRepairFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useRepairs(params);

  const [startTarget, setStartTarget] = useState<RepairResponse | null>(null);
  const [completeTarget, setCompleteTarget] = useState<RepairResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RepairResponse | null>(null);
  const [localTechnician, setLocalTechnician] = useState(technician ?? "");

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

  const rows = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter(
      (item) =>
        matchesRepairDateRange(item.repairDate, repairDateFrom, repairDateTo) &&
        matchesTechnicianFilter(item.technician, technician),
    );
  }, [data?.items, repairDateFrom, repairDateTo, technician]);

  const columns = getRepairTableColumns({
    params,
    onSort: setSorting,
    returnLabelById,
    productLabelById,
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
    Boolean(technician) ||
    Boolean(repairDateFrom) ||
    Boolean(repairDateTo);

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
            placeholder="Search by repair number, notes, or technician..."
            className="w-full sm:max-w-xs"
            aria-label="Search repairs"
          />
        }
        filters={
          <>
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

            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as RepairResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REPAIR_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
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
          </>
        }
        actions={
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
        }
        emptyState={
          <EmptyState
            title="No repairs found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first repair."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.repairsNew}>
                  <EmptyStateActionButton>Create repair</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading repairs..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

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
