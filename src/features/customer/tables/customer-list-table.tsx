"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
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
import { ROUTES } from "@/config/routes";
import { queryKeys } from "@/lib/query";
import { CustomerSummaryCards } from "../components/customer-summary-cards";
import { CustomerMobileList } from "../components/customer-mobile-list";
import {
  useCustomerPermissions,
  useCustomers,
  useCustomerListParams,
  useCustomerStats,
} from "../hooks";
import { getCustomerTableColumns } from "./customer-table-columns";
import { DeleteCustomerDialog } from "../dialogs/delete-customer-dialog";
import { ToggleCustomerStatusDialog } from "../dialogs/toggle-customer-status-dialog";
import type { CustomerResponse } from "../types";

type CustomerListTableProps = {
  onCreateClick?: () => void;
};

export function CustomerListTable({ onCreateClick }: CustomerListTableProps) {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setStatusFilter,
    setSorting,
    clearAllFilters,
  } = useCustomerListParams();
  const { canCreate, canUpdate, canDelete } = useCustomerPermissions();
  const stats = useCustomerStats();
  const { data, isLoading, isError, error, refetch, isFetching } = useCustomers(params);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CustomerResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<CustomerResponse | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const allRowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  const columns = getCustomerTableColumns({
    params,
    onSort: setSorting,
    selectedIds,
    onToggleRow: (id, checked) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    onToggleAll: (checked, ids) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        return next;
      });
    },
    allRowIds,
    canUpdate,
    canDelete,
    onDelete: setDeleteTarget,
    onToggleStatus: setStatusTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    void refetch();
  };

  const hasFilters = Boolean(params.search) || params.isActive !== undefined;

  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; onClear: () => void }> = [];

    if (params.search) {
      filters.push({
        id: "search",
        label: `Search: ${params.search}`,
        onClear: () => {
          setLocalSearch("");
          setSearch("");
        },
      });
    }

    if (params.isActive !== undefined) {
      filters.push({
        id: "status",
        label: params.isActive ? "Active only" : "Inactive only",
        onClear: () => setStatusFilter(undefined),
      });
    }

    return filters;
  }, [params.search, params.isActive, setLocalSearch, setSearch, setStatusFilter]);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load customers</p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An error occurred."}</p>
        <AppButton variant="outline" onClick={() => void refetch()}>
          Try again
        </AppButton>
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      title="No customers found"
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Get started by creating your first customer."
      }
      action={
        hasFilters ? (
          <AppButton variant="outline" onClick={clearAllFilters}>
            Clear filters
          </AppButton>
        ) : canCreate ? (
          onCreateClick ? (
            <EmptyStateActionButton onClick={onCreateClick}>Create customer</EmptyStateActionButton>
          ) : (
            <Link href={ROUTES.customersNew}>
              <EmptyStateActionButton>Create customer</EmptyStateActionButton>
            </Link>
          )
        ) : undefined
      }
    />
  );

  return (
    <>
      <CustomerSummaryCards
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        isLoading={stats.isLoading}
      />

      <div className="space-y-3">
        <ActiveFilters filters={activeFilters} onClearAll={clearAllFilters} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search by name, code, or phone..."
              className="w-full sm:max-w-sm"
              aria-label="Search customers"
            />
            <Select
              value={
                params.isActive === undefined ? "all" : params.isActive ? "active" : "inactive"
              }
              onValueChange={(value) => {
                if (value === "all") {
                  setStatusFilter(undefined);
                  return;
                }
                setStatusFilter(value === "active");
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {selectedIds.size} selected
              </span>
            ) : null}
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
              onClick={handleRefresh}
              loading={isFetching && !isLoading}
              aria-label="Refresh customer list"
            >
              Refresh
            </AppButton>
          </div>
        </div>

        <div className="hidden md:block">
          <DataTableShell
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            density="compact"
            emptyState={emptyState}
            loadingState={<LoadingState label="Loading customers..." />}
          />
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <LoadingState label="Loading customers..." />
          ) : rows.length === 0 ? (
            emptyState
          ) : (
            <CustomerMobileList
              rows={rows}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={setDeleteTarget}
              onToggleStatus={setStatusTarget}
            />
          )}
        </div>

        {data?.meta ? (
          <div className="flex justify-end">
            <DataPagination meta={data.meta} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <DeleteCustomerDialog
        customer={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      />

      <ToggleCustomerStatusDialog
        customer={statusTarget}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
      />
    </>
  );
}
