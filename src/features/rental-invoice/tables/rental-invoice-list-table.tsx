"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
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
import {
  matchesInvoiceDateRange,
  matchesPaymentStatusFilter,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
} from "../mappers";
import { RENTAL_INVOICE_STATUSES } from "../types";
import type { PaymentStatusFilter } from "../types";
import {
  useRentalInvoiceFilterOptions,
  useRentalInvoiceListParams,
  useRentalInvoicePermissions,
  useRentalInvoices,
} from "../hooks";
import { getRentalInvoiceTableColumns } from "./rental-invoice-list-table-columns";
import { IssueRentalInvoiceDialog } from "../dialogs/issue-rental-invoice-dialog";
import { VoidRentalInvoiceDialog } from "../dialogs/void-rental-invoice-dialog";
import type { RentalInvoiceResponse } from "../types";

const PAYMENT_STATUS_FILTERS: PaymentStatusFilter[] = [
  "unpaid",
  "partial",
  "paid",
  "void",
];

export function RentalInvoiceListTable() {
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

  const rows = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter(
      (item) =>
        matchesInvoiceDateRange(item.invoiceDate, invoiceDateFrom, invoiceDateTo) &&
        matchesPaymentStatusFilter(item, paymentStatus),
    );
  }, [data?.items, invoiceDateFrom, invoiceDateTo, paymentStatus]);

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

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
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
            placeholder="Search by invoice number or notes..."
            className="w-full sm:max-w-xs"
            aria-label="Search rental invoices"
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
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as RentalInvoiceResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {RENTAL_INVOICE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentStatus ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setPaymentStatusFilter(undefined);
                  return;
                }

                setPaymentStatusFilter(value as PaymentStatusFilter);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by payment status">
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment statuses</SelectItem>
                {PAYMENT_STATUS_FILTERS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {PAYMENT_STATUS_LABELS[status]}
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
          </>
        }
        actions={
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
        }
        emptyState={
          <EmptyState
            title="No rental invoices found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Rental invoices will appear here once created."
            }
          />
        }
        loadingState={<LoadingState label="Loading rental invoices..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

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
