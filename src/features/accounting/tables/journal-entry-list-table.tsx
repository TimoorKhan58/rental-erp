"use client";

import { useEffect, useState } from "react";
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
  JOURNAL_STATUS_LABELS,
  REFERENCE_TYPE_LABELS,
} from "../mappers";
import { JOURNAL_ENTRY_STATUSES, JOURNAL_REFERENCE_TYPES } from "../types";
import type { JournalEntryResponse } from "../types";
import {
  useJournalEntries,
  useJournalEntryListParams,
  useAccountingPermissions,
} from "../hooks";
import { getJournalEntryTableColumns } from "./journal-entry-list-table-columns";
import { PostJournalDialog } from "../dialogs/post-journal-dialog";
import { VoidJournalDialog } from "../dialogs/void-journal-dialog";

export function JournalEntryListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setStatusFilter,
    setReferenceTypeFilter,
    setDateRange,
    setSorting,
  } = useJournalEntryListParams();
  const { canPost, canVoid } = useAccountingPermissions();
  const { data, isLoading, isError, error, refetch, isFetching } = useJournalEntries(params);

  const [postTarget, setPostTarget] = useState<JournalEntryResponse | null>(null);
  const [voidTarget, setVoidTarget] = useState<JournalEntryResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const columns = getJournalEntryTableColumns({
    params,
    onSort: setSorting,
    canPost,
    canVoid,
    onPost: setPostTarget,
    onVoid: setVoidTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.accounting.journalEntries.lists(),
    });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.status) ||
    Boolean(params.referenceType) ||
    Boolean(params.journalDateFrom) ||
    Boolean(params.journalDateTo);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load journal entries</p>
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
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        search={
          <SearchInput
            value={localSearch}
            onChange={setLocalSearch}
            placeholder="Search by journal number or description..."
            className="w-full sm:max-w-xs"
            aria-label="Search journal entries"
          />
        }
        filters={
          <>
            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as JournalEntryResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {JOURNAL_ENTRY_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {JOURNAL_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.referenceType ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setReferenceTypeFilter(undefined);
                  return;
                }

                setReferenceTypeFilter(value as JournalEntryResponse["referenceType"] & string);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by reference type">
                <SelectValue placeholder="Reference type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All references</SelectItem>
                {JOURNAL_REFERENCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {REFERENCE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={params.journalDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, params.journalDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Journal date from"
            />
            <Input
              type="date"
              value={params.journalDateTo ?? ""}
              onChange={(event) =>
                setDateRange(params.journalDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Journal date to"
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
            aria-label="Refresh journal entries"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No journal entries found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Journal entries will appear here once created."
            }
          />
        }
        loadingState={<LoadingState label="Loading journal entries..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <PostJournalDialog
        journal={postTarget}
        open={Boolean(postTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPostTarget(null);
          }
        }}
      />

      <VoidJournalDialog
        journal={voidTarget}
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
