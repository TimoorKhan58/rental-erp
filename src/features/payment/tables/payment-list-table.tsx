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
import { matchesPaymentDateRange, matchesPaymentMethodFilter } from "../mappers";
import { PaymentMethodFilterChips, PaymentStatusFilterChips } from "../components";
import {
  usePaymentFilterOptions,
  usePaymentListParams,
  usePaymentPermissions,
  usePayments,
} from "../hooks";
import { getPaymentTableColumns } from "./payment-list-table-columns";
import { PostPaymentDialog } from "../dialogs/post-payment-dialog";
import { VoidPaymentDialog } from "../dialogs/void-payment-dialog";
import type { PaymentMethod, PaymentResponse, PaymentStatus } from "../types";

type PaymentListTableProps = {
  statusCounts?: Partial<Record<"all" | PaymentStatus, number>>;
  methodCounts?: Partial<Record<"all" | PaymentMethod, number>>;
};

export function PaymentListTable({
  statusCounts,
  methodCounts,
}: PaymentListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    paymentDateFrom,
    paymentDateTo,
    paymentMethod,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setCustomerFilter,
    setInvoiceFilter,
    setStatusFilter,
    setPaymentMethodFilter,
    setDateRange,
    setSorting,
  } = usePaymentListParams();
  const { canUpdate, canPost, canVoid } = usePaymentPermissions();
  const { customerOptions, invoiceOptions, customerLabelById, invoiceLabelById } =
    usePaymentFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = usePayments(params);

  const [postTarget, setPostTarget] = useState<PaymentResponse | null>(null);
  const [voidTarget, setVoidTarget] = useState<PaymentResponse | null>(null);

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
        matchesPaymentDateRange(item.paymentDate, paymentDateFrom, paymentDateTo) &&
        matchesPaymentMethodFilter(item, paymentMethod),
    );
  }, [data?.items, paymentDateFrom, paymentDateTo, paymentMethod]);

  const statusFilterValue = params.status ?? "all";
  const methodFilterValue = paymentMethod ?? "all";

  const columns = getPaymentTableColumns({
    params,
    onSort: setSorting,
    customerLabelById,
    invoiceLabelById,
    canUpdate,
    canPost,
    canVoid,
    onPost: setPostTarget,
    onVoid: setVoidTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.customerId) ||
    Boolean(params.rentalInvoiceId) ||
    Boolean(params.status) ||
    Boolean(paymentMethod) ||
    Boolean(paymentDateFrom) ||
    Boolean(paymentDateTo);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load payments</p>
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
        toolbar={
          <div className="space-y-3">
            <PaymentStatusFilterChips
              value={statusFilterValue}
              onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
              counts={statusCounts}
            />
            <PaymentMethodFilterChips
              value={methodFilterValue}
              onChange={(value) =>
                setPaymentMethodFilter(value === "all" ? undefined : value)
              }
              counts={methodCounts}
            />
          </div>
        }
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search payments..."
            className="w-full sm:max-w-xs"
            aria-label="Search payments"
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
              value={params.rentalInvoiceId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setInvoiceFilter(undefined);
                  return;
                }

                setInvoiceFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by invoice">
                <SelectValue placeholder="Invoice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All invoices</SelectItem>
                {invoiceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={paymentDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, paymentDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Payment date from"
            />
            <Input
              type="date"
              value={paymentDateTo ?? ""}
              onChange={(event) =>
                setDateRange(paymentDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Payment date to"
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
            aria-label="Refresh payment list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No payments found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Payments will appear here once recorded."
            }
          />
        }
        loadingState={<LoadingState label="Loading payments..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <PostPaymentDialog
        payment={postTarget}
        open={Boolean(postTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPostTarget(null);
          }
        }}
      />

      <VoidPaymentDialog
        payment={voidTarget}
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
