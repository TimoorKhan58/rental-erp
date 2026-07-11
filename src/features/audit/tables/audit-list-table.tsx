"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Columns3Icon, RefreshCwIcon } from "lucide-react";
import { DataTableShell, DataPagination } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { EmptyState, LoadingState, QueryErrorState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryKeys } from "@/lib/query";
import { cn } from "@/lib/utils";
import { ACTION_LABELS } from "../mappers";
import { AUDIT_ACTIONS } from "../types";
import type { AuditLogResponse, TableDensity } from "../types";
import { useAuditListParams, useAuditLogs } from "../hooks";
import { getAuditTableColumns, type AuditColumnId } from "./audit-list-table-columns";
import { AuditPreviewDrawer } from "../dialogs/audit-preview-drawer";

const DEFAULT_VISIBLE: AuditColumnId[] = [
  "createdAt",
  "action",
  "status",
  "module",
  "entityName",
  "recordId",
  "userId",
  "actions",
];

const COLUMN_LABELS: Record<AuditColumnId, string> = {
  createdAt: "Timestamp",
  action: "Action",
  status: "Status",
  module: "Module",
  entityName: "Entity",
  recordId: "Entity ID",
  userId: "Actor",
  requestId: "Request ID",
  actions: "Actions",
};

const densityClass: Record<TableDensity, string> = {
  compact: "[&_td]:py-1 [&_th]:py-1 text-xs",
  comfortable: "",
  spacious: "[&_td]:py-4 [&_th]:py-3",
};

export function AuditListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setEntityTypeFilter,
    setEntityIdFilter,
    setUserIdFilter,
    setActionFilter,
    setDateRange,
    setSorting,
  } = useAuditListParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLogs(params);

  const [previewTarget, setPreviewTarget] = useState<AuditLogResponse | null>(null);
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [visibleColumnIds, setVisibleColumnIds] = useState<AuditColumnId[]>(DEFAULT_VISIBLE);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  const visibleColumns = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  const columns = getAuditTableColumns({
    params,
    onSort: setSorting,
    visibleColumns,
    onPreview: setPreviewTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.entityType) ||
    Boolean(params.entityId) ||
    Boolean(params.userId) ||
    Boolean(params.action) ||
    Boolean(params.fromDate) ||
    Boolean(params.toDate);

  if (isError) {
    return (
      <QueryErrorState
        title="Failed to load audit logs"
        description={error?.message ?? "An error occurred."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <div className={cn(densityClass[density])}>
        <DataTableShell
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          search={
            <SearchInput
              value={localSearch}
              onChange={setLocalSearch}
              placeholder="Search module, entity, route, request ID..."
              className="w-full sm:max-w-sm"
              aria-label="Search audit logs"
            />
          }
          filters={
            <>
              <Input
                value={params.entityType ?? ""}
                onChange={(event) =>
                  setEntityTypeFilter(event.target.value || undefined)
                }
                placeholder="Entity type"
                className="w-full sm:w-36"
                aria-label="Filter by entity type"
              />
              <Input
                value={params.entityId ?? ""}
                onChange={(event) => setEntityIdFilter(event.target.value || undefined)}
                placeholder="Entity ID"
                className="w-full sm:w-40"
                aria-label="Filter by entity ID"
              />
              <Input
                value={params.userId ?? ""}
                onChange={(event) => setUserIdFilter(event.target.value || undefined)}
                placeholder="Actor user ID"
                className="w-full sm:w-44"
                aria-label="Filter by actor user ID"
              />
              <Select
                value={params.action ?? "all"}
                onValueChange={(value) => {
                  if (!value || value === "all") {
                    setActionFilter(undefined);
                    return;
                  }

                  setActionFilter(value as AuditLogResponse["action"]);
                }}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Filter by action">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {AUDIT_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={params.fromDate ?? ""}
                onChange={(event) =>
                  setDateRange(event.target.value || undefined, params.toDate)
                }
                className="w-full sm:w-40"
                aria-label="From date"
              />
              <Input
                type="date"
                value={params.toDate ?? ""}
                onChange={(event) =>
                  setDateRange(params.fromDate, event.target.value || undefined)
                }
                className="w-full sm:w-40"
                aria-label="To date"
              />
            </>
          }
          actions={
            <>
              <Select
                value={density}
                onValueChange={(value) => {
                  if (value) {
                    setDensity(value as TableDensity);
                  }
                }}
              >
                <SelectTrigger className="w-36" aria-label="Table density">
                  <SelectValue placeholder="Density" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<Columns3Icon className="size-4" aria-hidden="true" />}
                      aria-label="Toggle columns"
                    />
                  }
                >
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(COLUMN_LABELS) as AuditColumnId[]).map((columnId) => (
                    <DropdownMenuCheckboxItem
                      key={columnId}
                      checked={visibleColumns.has(columnId)}
                      onCheckedChange={(checked) => {
                        setVisibleColumnIds((prev) => {
                          if (checked) {
                            return prev.includes(columnId) ? prev : [...prev, columnId];
                          }

                          if (columnId === "actions" || columnId === "entityName") {
                            return prev;
                          }

                          return prev.filter((id) => id !== columnId);
                        });
                      }}
                    >
                      {COLUMN_LABELS[columnId]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <AppButton
                variant="outline"
                size="sm"
                leftIcon={<RefreshCwIcon className="size-4" aria-hidden="true" />}
                onClick={handleRefresh}
                loading={isFetching && !isLoading}
                aria-label="Refresh audit logs"
              >
                Refresh
              </AppButton>
            </>
          }
          emptyState={
            <EmptyState
              title="No audit logs found"
              description={
                hasFilters
                  ? "Try adjusting your search or filters."
                  : "Audit events will appear here as system activity is recorded."
              }
            />
          }
          loadingState={<LoadingState label="Loading audit logs..." />}
          pagination={
            data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
          }
        />
      </div>

      <AuditPreviewDrawer
        audit={previewTarget}
        open={Boolean(previewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTarget(null);
          }
        }}
      />
    </>
  );
}
