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
import { ReturnMobileList, ReturnStatusFilterChips } from "../components";
import {
  useReturnFilterOptions,
  useReturnListParams,
  useReturnPermissions,
  useReturns,
} from "../hooks";
import { getReturnTableColumns } from "./return-list-table-columns";
import { CancelReturnDialog } from "../dialogs/cancel-return-dialog";
import { CompleteReturnDialog } from "../dialogs/complete-return-dialog";
import { InspectReturnDialog } from "../dialogs/inspect-return-dialog";
import { ReceiveReturnDialog } from "../dialogs/receive-return-dialog";
import type { ReturnResponse, ReturnStatus } from "../types";

type ReturnListTableProps = {
  statusCounts?: Partial<Record<"all" | ReturnStatus, number>>;
};

export function ReturnListTable({ statusCounts }: ReturnListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    returnDateFrom,
    returnDateTo,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setRentalOrderFilter,
    setDispatchFilter,
    setStatusFilter,
    setDateRange,
    setSorting,
    clearAllFilters,
  } = useReturnListParams();
  const { canCreate, canUpdate, canReceive, canInspect, canComplete, canCancel } =
    useReturnPermissions();
  const { rentalOrderOptions, dispatchOptions, rentalOrderLabelById, dispatchLabelById } =
    useReturnFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useReturns(params);

  const [receiveTarget, setReceiveTarget] = useState<ReturnResponse | null>(null);
  const [inspectTarget, setInspectTarget] = useState<ReturnResponse | null>(null);
  const [completeTarget, setCompleteTarget] = useState<ReturnResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReturnResponse | null>(null);

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

  const columns = getReturnTableColumns({
    params,
    onSort: setSorting,
    rentalOrderLabelById,
    dispatchLabelById,
    canUpdate,
    canReceive,
    canInspect,
    canComplete,
    canCancel,
    onReceive: setReceiveTarget,
    onInspect: setInspectTarget,
    onComplete: setCompleteTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.rentalOrderId) ||
    Boolean(params.dispatchId) ||
    Boolean(params.status) ||
    Boolean(returnDateFrom) ||
    Boolean(returnDateTo);

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
    params.dispatchId
      ? {
          id: "dispatch",
          label: `Dispatch: ${dispatchLabelById.get(params.dispatchId) ?? params.dispatchId}`,
          onClear: () => setDispatchFilter(undefined),
        }
      : null,
    params.status
      ? {
          id: "status",
          label: `Status: ${STATUS_LABELS[params.status]}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    returnDateFrom || returnDateTo
      ? {
          id: "dates",
          label: `Dates: ${returnDateFrom ?? "…"} → ${returnDateTo ?? "…"}`,
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
        <p className="text-sm font-medium">Failed to load returns</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No returns found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Returns will appear here once created from a completed dispatch."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={clearAllFilters}>
            Clear filters
          </AppButton>
        ) : canCreate ? (
          <Link href={ROUTES.returnsNew}>
            <EmptyStateActionButton>Create return</EmptyStateActionButton>
          </Link>
        ) : undefined
      }
    />
  );

  return (
    <>
      <div className="space-y-3">
        <ReturnStatusFilterChips
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
              placeholder="Search return number or remarks..."
              className="w-full sm:max-w-xs"
              aria-label="Search returns by number or remarks"
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
              value={params.dispatchId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setDispatchFilter(undefined);
                  return;
                }

                setDispatchFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by dispatch">
                <SelectValue placeholder="Dispatch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dispatches</SelectItem>
                {dispatchOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={returnDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, returnDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Return date from"
            />
            <Input
              type="date"
              value={returnDateTo ?? ""}
              onChange={(event) =>
                setDateRange(returnDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Return date to"
            />
          </div>
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh return list"
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
            loadingState={<LoadingState label="Loading returns..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading returns..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <ReturnMobileList
              rows={rows}
              resolveOrderLabel={(rentalOrderId) =>
                rentalOrderLabelById.get(rentalOrderId) ?? rentalOrderId
              }
              resolveDispatchLabel={(dispatchId) =>
                dispatchLabelById.get(dispatchId) ?? dispatchId
              }
              canUpdate={canUpdate}
              canReceive={canReceive}
              canInspect={canInspect}
              canComplete={canComplete}
              canCancel={canCancel}
              onReceive={setReceiveTarget}
              onInspect={setInspectTarget}
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

      <ReceiveReturnDialog
        returnRecord={receiveTarget}
        open={Boolean(receiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReceiveTarget(null);
          }
        }}
      />

      <InspectReturnDialog
        returnRecord={inspectTarget}
        open={Boolean(inspectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setInspectTarget(null);
          }
        }}
      />

      <CompleteReturnDialog
        returnRecord={completeTarget}
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
          }
        }}
      />

      <CancelReturnDialog
        returnRecord={cancelTarget}
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
