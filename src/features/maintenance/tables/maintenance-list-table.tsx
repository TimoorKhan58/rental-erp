"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { DataTableShell, DataPagination } from "@/components/shared";
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
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/routes";
import { queryKeys } from "@/lib/query";
import {
  matchesScheduledDateRange,
  matchesServiceTypeFilter,
  matchesTechnicianFilter,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
} from "../mappers";
import { MAINTENANCE_SERVICE_TYPES, MAINTENANCE_STATUSES } from "../types";
import {
  useMaintenanceFilterOptions,
  useMaintenanceListParams,
  useMaintenancePermissions,
  useMaintenances,
} from "../hooks";
import { getMaintenanceTableColumns } from "./maintenance-list-table-columns";
import { CancelMaintenanceDialog } from "../dialogs/cancel-maintenance-dialog";
import { CompleteMaintenanceDialog } from "../dialogs/complete-maintenance-dialog";
import { StartMaintenanceDialog } from "../dialogs/start-maintenance-dialog";
import type { MaintenanceResponse } from "../types";

export function MaintenanceListTable() {
  const queryClient = useQueryClient();
  const {
    params,
    scheduledDateFrom,
    scheduledDateTo,
    technician,
    serviceType,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setProductFilter,
    setWarehouseFilter,
    setStatusFilter,
    setServiceTypeFilter,
    setTechnicianFilter,
    setDateRange,
    setSorting,
  } = useMaintenanceListParams();
  const { canCreate, canUpdate, canStart, canComplete, canCancel } =
    useMaintenancePermissions();
  const { productOptions, warehouseOptions, productLabelById } =
    useMaintenanceFilterOptions();
  const { data, isLoading, isError, error, refetch, isFetching } = useMaintenances(params);

  const [startTarget, setStartTarget] = useState<MaintenanceResponse | null>(null);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MaintenanceResponse | null>(null);
  const [localTechnician, setLocalTechnician] = useState(technician ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (params.search ?? "")) {
        setSearch(localSearch);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localSearch, params.search, setSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localTechnician !== (technician ?? "")) {
        setTechnicianFilter(localTechnician || undefined);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [localTechnician, technician, setTechnicianFilter]);

  const rows = useMemo(() => {
    const items = data?.items ?? [];

    return items.filter(
      (item) =>
        matchesScheduledDateRange(item.scheduledDate, scheduledDateFrom, scheduledDateTo) &&
        matchesTechnicianFilter(item.technician, technician) &&
        matchesServiceTypeFilter(item.serviceType, serviceType),
    );
  }, [data?.items, scheduledDateFrom, scheduledDateTo, technician, serviceType]);

  const columns = getMaintenanceTableColumns({
    params,
    onSort: setSorting,
    productLabelById,
    canUpdate,
    canStart,
    canComplete,
    canCancel,
    onStart: setStartTarget,
    onComplete: setCompleteTarget,
    onCancel: setCancelTarget,
  });

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.maintenances.lists() });
    void refetch();
  };

  const hasFilters =
    Boolean(params.search) ||
    Boolean(params.productId) ||
    Boolean(params.warehouseId) ||
    Boolean(params.status) ||
    Boolean(serviceType) ||
    Boolean(technician) ||
    Boolean(scheduledDateFrom) ||
    Boolean(scheduledDateTo);

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
        role="alert"
      >
        <p className="text-sm font-medium">Failed to load maintenance records</p>
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
            placeholder="Search by number, notes, technician, or vendor..."
            className="w-full sm:max-w-xs"
            aria-label="Search maintenance records"
          />
        }
        filters={
          <>
            <Select
              value={params.productId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setProductFilter(undefined);
                  return;
                }

                setProductFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by product">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {productOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.warehouseId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setWarehouseFilter(undefined);
                  return;
                }

                setWarehouseFilter(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by warehouse">
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouseOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.status ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setStatusFilter(undefined);
                  return;
                }

                setStatusFilter(value as MaintenanceResponse["status"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MAINTENANCE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={serviceType ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setServiceTypeFilter(undefined);
                  return;
                }

                setServiceTypeFilter(value as MaintenanceResponse["serviceType"]);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by service type">
                <SelectValue placeholder="Service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {MAINTENANCE_SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {SERVICE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SearchInput
              value={localTechnician}
              onChange={setLocalTechnician}
              placeholder="Technician"
              className="w-full sm:w-40"
              aria-label="Filter by technician"
            />

            <Input
              type="date"
              value={scheduledDateFrom ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, scheduledDateTo)
              }
              className="w-full sm:w-40"
              aria-label="Scheduled date from"
            />
            <Input
              type="date"
              value={scheduledDateTo ?? ""}
              onChange={(event) =>
                setDateRange(scheduledDateFrom, event.target.value || undefined)
              }
              className="w-full sm:w-40"
              aria-label="Scheduled date to"
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
            aria-label="Refresh maintenance list"
          >
            Refresh
          </AppButton>
        }
        emptyState={
          <EmptyState
            title="No maintenance records found"
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Get started by creating your first maintenance job."
            }
            action={
              canCreate ? (
                <Link href={ROUTES.maintenanceNew}>
                  <EmptyStateActionButton>Create maintenance</EmptyStateActionButton>
                </Link>
              ) : undefined
            }
          />
        }
        loadingState={<LoadingState label="Loading maintenance records..." />}
        pagination={
          data?.meta ? <DataPagination meta={data.meta} onPageChange={setPage} /> : null
        }
      />

      <StartMaintenanceDialog
        maintenance={startTarget}
        open={Boolean(startTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStartTarget(null);
          }
        }}
      />

      <CompleteMaintenanceDialog
        maintenance={completeTarget}
        open={Boolean(completeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
          }
        }}
      />

      <CancelMaintenanceDialog
        maintenance={cancelTarget}
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
      />
    </>
  );
}
