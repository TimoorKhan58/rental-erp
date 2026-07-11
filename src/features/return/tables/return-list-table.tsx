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
import { matchesReturnDateRange, STATUS_LABELS } from "../mappers";
import { RETURN_STATUSES } from "../types";
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
import type { ReturnResponse } from "../types";

export function ReturnListTable() {
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

  const rows = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter((item) =>
      matchesReturnDateRange(item.returnDate, returnDateFrom, returnDateTo),
    );
  }, [data?.items, returnDateFrom, returnDateTo]);

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
            placeholder="Search by return number or remarks..."
            className="w-full sm:max-w-xs"
            aria-label="Search returns"
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

            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as ReturnResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {RETURN_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
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
          </>
        }
        actions={
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
        }
        emptyState={
          <EmptyState
            title="No returns found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first return."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.returnsNew}>
                  <EmptyStateActionButton>Create return</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading returns..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

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
