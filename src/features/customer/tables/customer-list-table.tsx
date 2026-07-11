"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { DataTableShell } from "@/components/shared";
import { DataPagination } from "@/components/shared";
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
import {
  useCustomerPermissions,
  useCustomers,
  useCustomerListParams,
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
  const { params, localSearch, setLocalSearch, setSearch, setPage, setStatusFilter, setSorting } =
    useCustomerListParams();
  const { canCreate, canUpdate, canDelete } = useCustomerPermissions();
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

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
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
            placeholder="Search by name, code, or phone..."
            className="w-full sm:max-w-xs"
            aria-label="Search customers"
          />
        }
        filters={
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
                setStatusFilter(undefined);
                return;
              }

              setStatusFilter(value === "active");
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        actions={
          <>
            {selectedIds.size > 0 ? (
              <span className="text-sm text-muted-foreground" aria-live="polite">
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
          </>
        }
        emptyState={
          <EmptyState
            title="No customers found"
            description={
              params.search || params.isActive !== undefined
                ? "Try adjusting your search or filters."
                : "Get started by creating your first customer."
            }
            action={
              canCreate ? (
                onCreateClick ? (
                  <EmptyStateActionButton onClick={onCreateClick}>
                    Create customer
                  </EmptyStateActionButton>
                ) : (
                  <Link href={ROUTES.customersNew}>
                    <EmptyStateActionButton>Create customer</EmptyStateActionButton>
                  </Link>
                )
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading customers..." />}
        pagination={
          data?.meta ? (
            <DataPagination meta={data.meta} onPageChange={setPage} />
          ) : null
        }
      />

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
