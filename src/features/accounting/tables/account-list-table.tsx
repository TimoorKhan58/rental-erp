"use client";

import { useEffect } from "react";
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
import { queryKeys } from "@/lib/query";
import { ACCOUNT_TYPE_LABELS } from "../mappers";
import { ACCOUNT_TYPES } from "../types";
import {
  useAccountListParams,
  useChartOfAccounts,
} from "../hooks";
import { getAccountTableColumns } from "./account-list-table-columns";

export function AccountListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setAccountTypeFilter,
    setActiveFilter,
    setSorting,
  } = useAccountListParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useChartOfAccounts(params);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = getAccountTableColumns({ params, onSort: setSorting });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.accounts.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.accountType) ||
    params.isActive !== undefined;

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load chart of accounts</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <DataTableShell
      columns={columns}
      data={data?.items ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      search={
        <SearchInput
          value={localSearch}
          onChange={setLocalSearch}
          placeholder="Search by code, name, or description..."
          className="w-full sm:max-w-xs"
          aria-label="Search accounts"
        />
      }
      filters={
        <>
          <Select
            value={params.accountType ?? "all"}
            onValueChange={(value) => {
              if (!value || value === "all") {
                setAccountTypeFilter(undefined);
                return;
              }

              setAccountTypeFilter(value as typeof ACCOUNT_TYPES[number]);
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by account type">
              <SelectValue placeholder="Account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              params.isActive === undefined
                ? "all"
                : params.isActive
                  ? "active"
                  : "inactive"
            }
            onValueChange={(value) => {
              if (value === "all") {
                setActiveFilter(undefined);
                return;
              }

              setActiveFilter(value === "active");
            }}
          >
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by active status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
          aria-label="Refresh chart of accounts"
        >
          Refresh
        </AppButton>
      }
      emptyState={
        <EmptyState
          title="No accounts found"
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Accounts will appear here once created."
          }
        />
      }
      loadingState={<LoadingState label="Loading chart of accounts..." />}
      pagination={
        data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
      }
    />
  );
}
