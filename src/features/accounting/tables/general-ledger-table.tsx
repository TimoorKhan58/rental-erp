"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { MetricCard } from "@/components/design-system/card";
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
import { formatCurrency } from "@/lib/utils";
import {
  useChartOfAccounts,
  useGeneralLedger,
  useGeneralLedgerParams,
} from "../hooks";
import { getGeneralLedgerColumns } from "./general-ledger-table-columns";

export function GeneralLedgerTable() {
  const queryClient = useQueryClient();
  const {
    params,
    accountId,
    dateFrom,
    dateTo,
    setAccountId,
    setPage,
    setSearch,
    setDateRange,
  } = useGeneralLedgerParams();

  const { data: accountsData } = useChartOfAccounts({ pageSize: 100, isActive: true });
  const { data, isLoading, isError, error, refetch, isFetching } = useGeneralLedger(params);

  const accountOptions = useMemo(
    () =>
      (accountsData?.items ?? []).map((account) => ({
        id: account.id,
        label: `${account.accountCode} — ${account.name}`,
      })),
    [accountsData?.items],
  );

  const columns = getGeneralLedgerColumns();

  const paginationMeta = data
    ? {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
      }
    : null;

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.generalLedger({}) });
    void refetch();
  };

  if (!accountId) {
    return (
      <div className="space-y-4">
        <Select
          value=""
          onValueChange={(value) => {
            if (value) {
              setAccountId(value);
            }
          }}
        >
          <SelectTrigger className="w-full sm:max-w-md" aria-label="Select account">
            <SelectValue placeholder="Select an account to view ledger" />
          </SelectTrigger>
          <SelectContent>
            {accountOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <EmptyState
          title="Select an account"
          description="Choose an account to view its general ledger entries."
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load general ledger</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Account" value={`${data.accountCode} — ${data.accountName}`} />
          <MetricCard label="Opening balance" value={formatCurrency(data.openingBalance)} />
          <MetricCard label="Closing balance" value={formatCurrency(data.closingBalance)} />
          <MetricCard label="Account type" value={data.accountType} />
        </div>
      ) : null}

      <DataTableShell
        columns={columns}
        data={data?.entries ?? []}
        getRowId={(row) => `${row.journalEntryId}-${row.journalDate}`}
        isLoading={isLoading}
        search={
          <SearchInput
            value={params?.search ?? ""}
            onChange={setSearch}
            placeholder="Search ledger entries..."
            className="w-full sm:max-w-xs"
            aria-label="Search general ledger"
          />
        }
        filters={
          <>
            <Select
              value={accountId}
              onValueChange={(value) => {
                if (value) {
                  setAccountId(value);
                }
              }}
            >
              <SelectTrigger className="w-full sm:max-w-md" aria-label="Select account">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, dateTo)
              }
              className="w-full sm:w-40"
              aria-label="Date from"
            />
            <Input
              type="date"
              value={dateTo ?? ""}
              onChange={(event) =>
                setDateRange(dateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Date to"
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
            aria-label="Refresh general ledger"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No ledger entries"
            description="Ledger entries will appear for posted journal activity on this account."
          />
        }
        loadingState={<LoadingState label="Loading general ledger..." />}
        pagination={
          paginationMeta ? (
            <DataPagination meta={paginationMeta} onPageChange={setPage} />
          ) : null
        }
      />
    </div>
  );
}
