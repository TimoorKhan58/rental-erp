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
  useSupplierPermissions,
  useSuppliers,
  useSupplierListParams,
} from "../hooks";
import { getSupplierTableColumns } from "./supplier-table-columns";
import { DeleteSupplierDialog } from "../dialogs/delete-supplier-dialog";
import { ToggleSupplierStatusDialog } from "../dialogs/toggle-supplier-status-dialog";
import type { SupplierResponse } from "../types";

type SupplierListTableProps = {
  onCreateClick?: () => void;
};

export function SupplierListTable({ onCreateClick }: SupplierListTableProps) {
  const queryClient = useQueryClient();
  const { params, localSearch, setLocalSearch, setSearch, setPage, setStatusFilter, setSorting } =
    useSupplierListParams();
  const { canCreate, canUpdate, canDelete } = useSupplierPermissions();
  const { data, isLoading, isError, error, refetch, isFetching } = useSuppliers(params);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<SupplierResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<SupplierResponse | null>(null);

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

  const columns = getSupplierTableColumns({
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
    void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    void refetch();
  };

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load suppliers</p>
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
            placeholder="Search by name, code, phone, or email..."
            className="w-full sm:max-w-xs"
            aria-label="Search suppliers"
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
              aria-label="Refresh supplier list"
            >
              Refresh
            </AppButton>
          </>
        }
        emptyState={
          <EmptyState
            title="No suppliers found"
            description={
              params.search || params.isActive !== undefined
                ? "Try adjusting your search or filters."
                : "Get started by creating your first supplier."
            }
            action={
              canCreate ? (
                onCreateClick ? (
                  <EmptyStateActionButton onClick={onCreateClick}>
                    Create supplier
                  </EmptyStateActionButton>
                ) : (
                  <Link href={ROUTES.suppliersNew}>
                    <EmptyStateActionButton>Create supplier</EmptyStateActionButton>
                  </Link>
                )
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading suppliers..." />}
        pagination={
          data?.meta ? (
            <DataPagination meta={data.meta} onPageChange={setPage} />
          ) : null
        }
      />

      <DeleteSupplierDialog
        supplier={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      />

      <ToggleSupplierStatusDialog
        supplier={statusTarget}
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
