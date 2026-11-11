"use client";

import { useEffect, useMemo, useState } from "react";
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
import { METHOD_LABELS, STATUS_LABELS } from "../mappers";
import {
  PaymentMethodFilterChips,
  PaymentMobileList,
  PaymentStatusFilterChips,
} from "../components";
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
    clearAllFilters,
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

  const scopedInvoiceOptions = useMemo(() => {
    if (!params.customerId) {
      return invoiceOptions;
    }

    return invoiceOptions.filter((option) => option.customerId === params.customerId);
  }, [invoiceOptions, params.customerId]);

  const rows = data?.items ?? [];

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
    params.rentalInvoiceId
      ? {
          id: "invoice",
          label: `Invoice: ${invoiceLabelById.get(params.rentalInvoiceId) ?? params.rentalInvoiceId}`,
          onClear: () => setInvoiceFilter(undefined),
        }
      : null,
    params.status
      ? {
          id: "status",
          label: `Status: ${STATUS_LABELS[params.status]}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    paymentMethod
      ? {
          id: "method",
          label: `Method: ${METHOD_LABELS[paymentMethod]}`,
          onClear: () => setPaymentMethodFilter(undefined),
        }
      : null,
    paymentDateFrom || paymentDateTo
      ? {
          id: "dates",
          label: `Dates: ${paymentDateFrom ?? "…"} → ${paymentDateTo ?? "…"}`,
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
        <p className="text-sm font-medium">Failed to load payments</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No payments found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Payments will appear here once recorded."
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
        <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search payment number, reference, or notes..."
              className="w-full sm:max-w-xs"
              aria-label="Search payments by payment number, reference, or notes"
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
                {scopedInvoiceOptions.map((option) => (
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
          </div>
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
        </div>

        <div className="hidden md:block">
          <DataTableShell
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            density="compact"
            emptyState={emptyState}
            loadingState={<LoadingState label="Loading payments..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading payments..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <PaymentMobileList
              rows={rows}
              resolveCustomerName={(customerId) =>
                customerLabelById.get(customerId) ?? customerId
              }
              resolveInvoiceLabel={(invoiceId) =>
                invoiceLabelById.get(invoiceId) ?? invoiceId
              }
              canUpdate={canUpdate}
              canPost={canPost}
              canVoid={canVoid}
              onPost={setPostTarget}
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
