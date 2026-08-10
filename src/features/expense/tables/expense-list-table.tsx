"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, LoadingState } from "@/components/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/query";
import { TYPE_LABELS } from "../mappers";
import { ExpenseStatusFilterChips } from "../components";
import {
  useExpenseFilterOptions,
  useExpenseListParams,
  useExpensePermissions,
  useExpenses,
} from "../hooks";
import { getExpenseTableColumns } from "./expense-list-table-columns";
import {
  ApproveExpenseDialog,
  PayExpenseDialog,
  RejectExpenseDialog,
  SubmitExpenseDialog,
} from "../dialogs";
import { EXPENSE_TYPES, type ExpenseResponse, type ExpenseStatus } from "../types";

type ExpenseListTableProps = {
  statusCounts?: Partial<Record<"all" | ExpenseStatus, number>>;
};

export function ExpenseListTable({ statusCounts }: ExpenseListTableProps = {}) {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setStatusFilter,
    setTypeFilter,
    setCategoryFilter,
    setSupplierFilter,
    setSorting,
  } = useExpenseListParams();
  const { canUpdate, canApprove, canReject, canPay } = useExpensePermissions();
  const { categoryOptions, supplierOptions, categoryLabelById, supplierLabelById } =
    useExpenseFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useExpenses(params);

  const [submitTarget, setSubmitTarget] = useState<ExpenseResponse | null>(null);
  const [approveTarget, setApproveTarget] = useState<ExpenseResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExpenseResponse | null>(null);
  const [payTarget, setPayTarget] = useState<ExpenseResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const statusFilterValue = params.status ?? "all";
  const rows = data?.items ?? [];

  const columns = getExpenseTableColumns({
    params,
    onSort: setSorting,
    categoryLabelById,
    supplierLabelById,
    canUpdate,
    canApprove,
    canReject,
    canPay,
    onSubmit: setSubmitTarget,
    onApprove: setApproveTarget,
    onReject: setRejectTarget,
    onPay: setPayTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.status) ||
    Boolean(params.expenseType) ||
    Boolean(params.categoryId) ||
    Boolean(params.supplierId);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load expenses</p>
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
          <ExpenseStatusFilterChips
            value={statusFilterValue}
            onChange={(value) => setStatusFilter(value === "all" ? undefined : value)}
            counts={statusCounts}
          />
        }
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search expenses..."
            className="w-full sm:max-w-xs"
            aria-label="Search expenses"
          />
        }
        filters={
          <>
            <Select
              value={params.expenseType ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setTypeFilter(undefined);
                  return;
                }
                setTypeFilter(value as (typeof EXPENSE_TYPES)[number]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.categoryId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setCategoryFilter(undefined);
                  return;
                }
                setCategoryFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          </>
        }
        actions={
          <AppButton
            variant="outline"
            size="sm"
            leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
            onClick={handleRefresh}
            loading={isFetching && !isLoading}
            aria-label="Refresh expense list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No expenses found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Expenses will appear here once recorded."
            }
          />
        }
        loadingState={<LoadingState label="Loading expenses..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <SubmitExpenseDialog
        expense={submitTarget}
        open={Boolean(submitTarget)}
        onOpenChange={(open) => {
          if (!open) setSubmitTarget(null);
        }}
      />
      <ApproveExpenseDialog
        expense={approveTarget}
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      />
      <RejectExpenseDialog
        expense={rejectTarget}
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      />
      <PayExpenseDialog
        expense={payTarget}
        open={Boolean(payTarget)}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      />
    </>
  );
}
