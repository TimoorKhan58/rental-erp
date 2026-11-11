"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
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
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/query";
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../mappers";
import {
  RentalInvoiceMobileList,
  RentalInvoicePaymentStatusFilterChips,
  RentalInvoiceStatusFilterChips,
} from "../components";
import {
  useRentalInvoiceFilterOptions,
  useRentalInvoiceListParams,
  useRentalInvoicePermissions,
  useRentalInvoices,
} from "../hooks";
import { getRentalInvoiceTableColumns } from "./rental-invoice-list-table-columns";
import { IssueRentalInvoiceDialog } from "../dialogs/issue-rental-invoice-dialog";
import { VoidRentalInvoiceDialog } from "../dialogs/void-rental-invoice-dialog";
import type { PaymentStatusFilter, RentalInvoiceResponse, RentalInvoiceStatus } from "../types";

type RentalInvoiceListTableProps = {
  statusCounts?: Partial<Record<"all" | RentalInvoiceStatus, number>>;
  paymentStatusCounts?: Partial<Record<"all" | PaymentStatusFilter, number>>;
};

export function RentalInvoiceListTable({
  statusCounts,
  paymentStatusCounts,
}: RentalInvoiceListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    invoiceDateFrom,
    invoiceDateTo,
    paymentStatus,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setCustomerFilter,
    setRentalOrderFilter,
    setStatusFilter,
    setPaymentStatusFilter,
    setDateRange,
    setSorting,
    clearAllFilters,
  } = useRentalInvoiceListParams();
  const { canIssue, canVoid } = useRentalInvoicePermissions();
  const { customerOptions, rentalOrderOptions, customerLabelById, rentalOrderLabelById } =
    useRentalInvoiceFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useRentalInvoices(params);

  const [issueTarget, setIssueTarget] = useState<RentalInvoiceResponse | null>(null);
  const [voidTarget, setVoidTarget] = useState<RentalInvoiceResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const rows = data?.items ?? [];

  const statusFilterValue = params.status ?? "all";
  const paymentStatusFilterValue = paymentStatus ?? "all";

  const columns = getRentalInvoiceTableColumns({
    params,
    onSort: setSorting,
    customerLabelById,
    rentalOrderLabelById,
    canIssue,
    canVoid,
    onIssue: setIssueTarget,
    onVoid: setVoidTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.customerId) ||
    Boolean(params.rentalOrderId) ||
    Boolean(params.status) ||
    Boolean(paymentStatus) ||
    Boolean(invoiceDateFrom) ||
    Boolean(invoiceDateTo);

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
    params.customerId
      ? {
          id: "customer",
          label: `Customer: ${customerLabelById.get(params.customerId) ?? params.customerId}`,
          onClear: () => setCustomerFilter(undefined),
        }
      : null,
    params.rentalOrderId
      ? {
          id: "order",
          label: `Order: ${rentalOrderLabelById.get(params.rentalOrderId) ?? params.rentalOrderId}`,
          onClear: () => setRentalOrderFilter(undefined),
        }
      : null,
    params.status
      ? {
          id: "status",
          label: `Status: ${STATUS_LABELS[params.status]}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    paymentStatus
      ? {
          id: "paymentStatus",
          label: `Collection: ${PAYMENT_STATUS_LABELS[paymentStatus]}`,
          onClear: () => setPaymentStatusFilter(undefined),
        }
      : null,
    invoiceDateFrom || invoiceDateTo
      ? {
          id: "dates",
          label: `Dates: ${invoiceDateFrom ?? "…"} → ${invoiceDateTo ?? "…"}`,
          onClear: () => setDateRange(undefined, undefined),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; onClear: () => void }>;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load rental invoices</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No rental invoices found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Rental invoices will appear here once created."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={clearAllFilters}>
            Clear filters
          </AppButton>
        ) : undefined
      }
    />
  );

  return (
    <>
      <div className="space-y-3">
        <RentalInvoiceStatusFilterChips
          value={statusFilterValue}
          onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
          counts={statusCounts}
        />
        <RentalInvoicePaymentStatusFilterChips
          value={paymentStatusFilterValue}
          onChange={(value) =>
            setPaymentStatusFilter(value === "all" ? undefined : value)
          }
          counts={paymentStatusCounts}
        />
        <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search invoice number or notes..."
              className="w-full sm:max-w-xs"
              aria-label="Search rental invoices"
            />
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

            <Input
              type="date"
              value={invoiceDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, invoiceDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Invoice date from"
            />
            <Input
              type="date"
              value={invoiceDateTo ?? ""}
              onChange={(event) =>
                setDateRange(invoiceDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Invoice date to"
            />
          </div>
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh invoice list"
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
            loadingState={<LoadingState label="Loading rental invoices..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading rental invoices..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <RentalInvoiceMobileList
              rows={rows}
              resolveCustomerName={(customerId) =>
                customerLabelById.get(customerId) ?? customerId
              }
              canIssue={canIssue}
              canVoid={canVoid}
              onIssue={setIssueTarget}
              onVoid={setVoidTarget}
            />
          )}
        </div>

        {data?.meta ? (
          <div className="flex justify-end">
            <DataPagination meta={data.meta} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <IssueRentalInvoiceDialog
        invoice={issueTarget}
        open={Boolean(issueTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setIssueTarget(null);
          }
        }}
      />

      <VoidRentalInvoiceDialog
        invoice={voidTarget}
        open={Boolean(voidTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
          }
        }}
      />
    </>
  );
}
