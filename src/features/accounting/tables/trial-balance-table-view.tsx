"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { DataTableShell } from "@/components/shared";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { EmptyState } from "@/components/feedback";
import { LoadingState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/query";
import { formatCurrency } from "@/lib/utils";
import { useTrialBalance, useTrialBalanceParams } from "../hooks";
import { getTrialBalanceColumns } from "./trial-balance-table";

export function TrialBalanceTable() {
  const queryClient = useQueryClient();
  const { params, dateFrom, dateTo, setDateRange } = useTrialBalanceParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useTrialBalance(params);

  const columns = getTrialBalanceColumns();

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.trialBalance({}) });
    void refetch();
  };

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load trial balance</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DataTableShell
        columns={columns}
        data={data?.lines ?? []}
        getRowId={(row) => row.accountId}
        isLoading={isLoading}
        filters={
          <>
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
            aria-label="Refresh trial balance"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No trial balance data"
            description="Trial balance lines will appear when posted journal entries exist."
          />
        }
        loadingState={<LoadingState label="Loading trial balance..." />}
      />

      {data ? (
        <SectionCard title="Totals">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total debit
              </dt>
              <dd className="text-lg font-semibold">{formatCurrency(data.totalDebit)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total credit
              </dt>
              <dd className="text-lg font-semibold">{formatCurrency(data.totalCredit)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Balanced
              </dt>
              <dd className="text-lg font-semibold">{data.isBalanced ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </SectionCard>
      ) : null}
    </div>
  );
}
