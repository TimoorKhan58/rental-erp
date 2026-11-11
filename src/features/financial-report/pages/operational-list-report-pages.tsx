"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { MetricCard } from "@/components/design-system/card";
import { ActiveFilters, DataTableShell, DataPagination } from "@/components/shared";
import type { ActiveFilterChip } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import { SearchInput } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { LoadingState, EmptyState } from "@/components/feedback";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import type { CsvColumnDef } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { getWarehouses } from "@/features/warehouse/services";
import { getSuppliers } from "@/features/supplier/services";
import { ExportReportButton, ReportPermissionGate, ReportsSubNav } from "../components";
import {
  compactActiveFilters,
  dateRangeFilterChip,
  toPaginationMeta,
} from "../mappers";
import {
  DISPATCH_REPORT_STATUS_OPTIONS,
  MAINTENANCE_REPORT_STATUS_OPTIONS,
  PROCUREMENT_REPORT_STATUS_OPTIONS,
  REPAIR_REPORT_STATUS_OPTIONS,
  RETURN_REPORT_STATUS_OPTIONS,
} from "../constants/report-filter-options";
import {
  useDispatchReport,
  useMaintenanceReport,
  useOperationalListReportParams,
  useProcurementReport,
  useRepairReport,
  useReturnReport,
  useSupplierReport,
  useWarehouseReport,
} from "../hooks";
import {
  getDispatchReportColumns,
  getMaintenanceReportColumns,
  getProcurementReportColumns,
  getRepairReportColumns,
  getReturnReportColumns,
  getSupplierReportColumns,
  getWarehouseReportColumns,
} from "../tables";
import type {
  DispatchReportLine,
  MaintenanceReportLine,
  ProcurementReportLine,
  RepairReportLine,
  ReturnReportLine,
  SupplierReportLine,
  WarehouseReportLine,
} from "../types";

type Metric = { label: string; value: string };

type OperationalListReportShellProps<T extends { id?: string } | object> = {
  title: string;
  description: string;
  breadcrumb: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  columns: Array<DataTableColumn<T>>;
  csvFilename: string;
  csvColumns: Array<CsvColumnDef<T>>;
  rows: T[];
  getRowId: (row: T) => string;
  metrics?: Metric[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isFetching: boolean;
  onRefresh: () => void;
  localSearch: string;
  setLocalSearch: (value: string) => void;
  paramsSearch?: string;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  filters?: ReactNode;
  activeFilters?: ActiveFilterChip[];
  onClearAllFilters?: () => void;
  hasActiveFilters?: boolean;
};

function OperationalListReportShell<T extends object>({
  title,
  description,
  breadcrumb,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  columns,
  csvFilename,
  csvColumns,
  rows,
  getRowId,
  metrics,
  pagination,
  isLoading,
  isError,
  errorMessage,
  isFetching,
  onRefresh,
  localSearch,
  setLocalSearch,
  paramsSearch,
  setSearch,
  setPage,
  filters,
  activeFilters = [],
  onClearAllFilters,
  hasActiveFilters = false,
}: OperationalListReportShellProps<T>) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== (paramsSearch ?? "")) {
        setSearch(localSearch);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearch, paramsSearch, setSearch]);

  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reports },
          { label: breadcrumb },
        ]}
      />
      <ReportsSubNav />
      <ReportPermissionGate requireOperational>
        <Suspense fallback={<LoadingState label={`Loading ${breadcrumb.toLowerCase()} report...`} />}>
          <div className="space-y-5">
          {isError ? (
            <div
              className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
              role="alert"
            >
              <p className="text-sm font-medium">Failed to load {breadcrumb.toLowerCase()} report</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ?? "An error occurred."}
              </p>
              <AppButton variant="outline" onClick={onRefresh}>
                Try again
              </AppButton>
            </div>
          ) : (
            <>
              {metrics && metrics.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {metrics.map((metric) => (
                    <MetricCard
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                    />
                  ))}
                </div>
              ) : null}

              {onClearAllFilters ? (
                <ActiveFilters filters={activeFilters} onClearAll={onClearAllFilters} />
              ) : null}

              <DataTableShell
                columns={columns}
                data={rows}
                getRowId={getRowId}
                isLoading={isLoading}
                search={
                  <SearchInput
                    value={localSearch}
                    onChange={setLocalSearch}
                    placeholder={searchPlaceholder}
                    className="w-full sm:max-w-xs"
                    aria-label={`Search ${breadcrumb.toLowerCase()} report`}
                  />
                }
                filters={filters}
                actions={
                  <>
                    <AppButton
                      variant="outline"
                      size="sm"
                      loading={isFetching && !isLoading}
                      onClick={onRefresh}
                    >
                      Refresh
                    </AppButton>
                    <ExportReportButton
                      filename={csvFilename}
                      rows={rows}
                      columns={csvColumns}
                      disabled={isLoading || rows.length === 0}
                    />
                  </>
                }
                emptyState={
                  <EmptyState
                    title={hasActiveFilters ? "No matching rows" : emptyTitle}
                    description={
                      hasActiveFilters
                        ? "No report rows match the current search or filters."
                        : emptyDescription
                    }
                    action={
                      hasActiveFilters && onClearAllFilters ? (
                        <AppButton variant="outline" onClick={onClearAllFilters}>
                          Clear filters
                        </AppButton>
                      ) : undefined
                    }
                  />
                }
                loadingState={
                  <LoadingState label={`Loading ${breadcrumb.toLowerCase()} report...`} />
                }
                pagination={
                  pagination ? (
                    <DataPagination
                      meta={toPaginationMeta(pagination)}
                      onPageChange={setPage}
                    />
                  ) : null
                }
              />
            </>
          )}
        </div>
        </Suspense>
      </ReportPermissionGate>
    </PageContainer>
  );
}

function DateRangeFilters({
  dateFrom,
  dateTo,
  onChange,
  fieldHint,
}: {
  dateFrom?: string;
  dateTo?: string;
  onChange: (from?: string, to?: string) => void;
  fieldHint: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom ?? ""}
          onChange={(event) => onChange(event.target.value || undefined, dateTo)}
          className="w-full sm:w-40"
          aria-label={`Date from (${fieldHint})`}
        />
        <Input
          type="date"
          value={dateTo ?? ""}
          onChange={(event) => onChange(dateFrom, event.target.value || undefined)}
          className="w-full sm:w-40"
          aria-label={`Date to (${fieldHint})`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{fieldHint}</p>
    </div>
  );
}

function WarehouseFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(!next || next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-full sm:w-48" aria-label="Filter by warehouse">
        <SelectValue placeholder="Warehouse" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All warehouses</SelectItem>
        {(warehouses.data?.items ?? []).map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.warehouseCode} — {warehouse.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SupplierFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const suppliers = useQuery({
    queryKey: queryKeys.suppliers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getSuppliers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(!next || next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-full sm:w-48" aria-label="Filter by supplier">
        <SelectValue placeholder="Supplier" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All suppliers</SelectItem>
        {(suppliers.data?.items ?? []).map((supplier) => (
          <SelectItem key={supplier.id} value={supplier.id}>
            {supplier.supplierCode} — {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusFilter({
  value,
  onChange,
  options,
}: {
  value?: string;
  onChange: (value?: string) => void;
  options: string[];
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(next) => onChange(!next || next === "all" ? undefined : next)}
    >
      <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {options.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SupplierReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setSupplierFilter,
    clearAllFilters,
  } = useOperationalListReportParams({ defaultSortOrder: "asc" });
  const query = useSupplierReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Order date", () =>
      setDateRange(undefined, undefined),
    ),
    params.supplierId
      ? {
          id: "supplier",
          label: "Supplier",
          onClear: () => setSupplierFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<SupplierReportLine>
      title="Suppliers Report"
      description="Purchase activity and spend by supplier. Date range uses purchase-order date."
      breadcrumb="Suppliers"
      searchPlaceholder="Search supplier code or name..."
      emptyTitle="No supplier data"
      emptyDescription="Supplier purchase activity will appear here."
      columns={getSupplierReportColumns()}
      csvFilename="suppliers-report.csv"
      csvColumns={[
        { header: "Supplier code", value: (row) => row.supplierCode },
        { header: "Supplier name", value: (row) => row.supplierName },
        { header: "PO count", value: (row) => row.purchaseOrderCount },
        { header: "Purchase total", value: (row) => row.purchaseTotal },
        { header: "Last order", value: (row) => row.lastOrderDate },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.supplierId}
      metrics={
        query.data
          ? [
              { label: "Suppliers", value: String(query.data.totalSuppliers) },
              {
                label: "Purchase value",
                value: formatCurrency(query.data.totalPurchaseValue),
              },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on purchase-order date"
          />
          <SupplierFilter value={params.supplierId} onChange={setSupplierFilter} />
        </>
      }
    />
  );
}

export function WarehouseReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setWarehouseFilter,
    clearAllFilters,
  } = useOperationalListReportParams({ defaultSortOrder: "asc" });
  const query = useWarehouseReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<WarehouseReportLine>
      title="Warehouses Report"
      description="Current stock quantity, availability, and inventory value by warehouse. No date filter — snapshot only."
      breadcrumb="Warehouses"
      searchPlaceholder="Search warehouse code or name..."
      emptyTitle="No warehouse data"
      emptyDescription="Warehouse inventory summaries will appear here."
      columns={getWarehouseReportColumns()}
      csvFilename="warehouses-report.csv"
      csvColumns={[
        { header: "Warehouse code", value: (row) => row.warehouseCode },
        { header: "Warehouse name", value: (row) => row.warehouseName },
        { header: "Products", value: (row) => row.productCount },
        { header: "On hand", value: (row) => row.inventoryQuantity },
        { header: "Available", value: (row) => row.availableQuantity },
        { header: "Value", value: (row) => row.inventoryValue },
        { header: "Utilization %", value: (row) => row.utilizationPercent },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.warehouseId}
      metrics={
        query.data
          ? [
              { label: "Warehouses", value: String(query.data.totalWarehouses) },
              {
                label: "Inventory value",
                value: formatCurrency(query.data.totalInventoryValue),
              },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <WarehouseFilter value={params.warehouseId} onChange={setWarehouseFilter} />
      }
    />
  );
}

export function ProcurementReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setStatusFilter,
    setWarehouseFilter,
    setSupplierFilter,
    clearAllFilters,
  } = useOperationalListReportParams();
  const query = useProcurementReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Order date", () =>
      setDateRange(undefined, undefined),
    ),
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    params.supplierId
      ? {
          id: "supplier",
          label: "Supplier",
          onClear: () => setSupplierFilter(undefined),
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<ProcurementReportLine>
      title="Procurement Report"
      description="Purchase orders by order date, supplier, warehouse, and status. Approve does not receive stock."
      breadcrumb="Procurement"
      searchPlaceholder="Search PO number, supplier, warehouse, or status..."
      emptyTitle="No procurement data"
      emptyDescription="Purchase orders will appear here."
      columns={getProcurementReportColumns()}
      csvFilename="procurement-report.csv"
      csvColumns={[
        { header: "PO number", value: (row) => row.poNumber },
        { header: "Supplier", value: (row) => row.supplierName },
        { header: "Warehouse", value: (row) => row.warehouseName },
        { header: "Status", value: (row) => row.status },
        { header: "Order date", value: (row) => row.orderDate },
        { header: "Lines", value: (row) => row.lineCount },
        { header: "Total", value: (row) => row.purchaseTotal },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.id}
      metrics={
        query.data
          ? [
              { label: "Purchase orders", value: String(query.data.totalPurchaseOrders) },
              {
                label: "Purchase value",
                value: formatCurrency(query.data.totalPurchaseValue),
              },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on purchase-order date"
          />
          <StatusFilter
            value={params.status}
            onChange={setStatusFilter}
            options={PROCUREMENT_REPORT_STATUS_OPTIONS}
          />
          <SupplierFilter value={params.supplierId} onChange={setSupplierFilter} />
          <WarehouseFilter value={params.warehouseId} onChange={setWarehouseFilter} />
        </>
      }
    />
  );
}

export function DispatchReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setStatusFilter,
    clearAllFilters,
  } = useOperationalListReportParams();
  const query = useDispatchReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Dispatch date", () =>
      setDateRange(undefined, undefined),
    ),
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<DispatchReportLine>
      title="Dispatches Report"
      description="Dispatch records by dispatch date and domain status."
      breadcrumb="Dispatches"
      searchPlaceholder="Search dispatch number, order, status, or method..."
      emptyTitle="No dispatch data"
      emptyDescription="Dispatch activity will appear here."
      columns={getDispatchReportColumns()}
      csvFilename="dispatches-report.csv"
      csvColumns={[
        { header: "Dispatch", value: (row) => row.dispatchNumber },
        { header: "Order", value: (row) => row.orderNumber },
        { header: "Status", value: (row) => row.status },
        { header: "Dispatch date", value: (row) => row.dispatchDate },
        { header: "Method", value: (row) => row.deliveryMethod },
        { header: "Turnaround hours", value: (row) => row.turnaroundHours },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.id}
      metrics={
        query.data
          ? [
              { label: "Ready + dispatched", value: String(query.data.pendingCount) },
              { label: "Completed", value: String(query.data.completedCount) },
              {
                label: "Avg turnaround (h)",
                value:
                  query.data.averageTurnaroundHours == null
                    ? "—"
                    : String(query.data.averageTurnaroundHours),
              },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on dispatch date"
          />
          <StatusFilter
            value={params.status}
            onChange={setStatusFilter}
            options={DISPATCH_REPORT_STATUS_OPTIONS}
          />
        </>
      }
    />
  );
}

export function ReturnReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setStatusFilter,
    clearAllFilters,
  } = useOperationalListReportParams();
  const query = useReturnReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Inspection date", () =>
      setDateRange(undefined, undefined),
    ),
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<ReturnReportLine>
      title="Returns Report"
      description="Return inspections by inspection date. Inventory movement still occurs only when a return is completed."
      breadcrumb="Returns"
      searchPlaceholder="Search return number, order, or status..."
      emptyTitle="No return data"
      emptyDescription="Return activity will appear here."
      columns={getReturnReportColumns()}
      csvFilename="returns-report.csv"
      csvColumns={[
        { header: "Return", value: (row) => row.returnNumber },
        { header: "Order", value: (row) => row.orderNumber },
        { header: "Status", value: (row) => row.status },
        { header: "Inspection", value: (row) => row.inspectionDate },
        { header: "Damaged", value: (row) => row.damagedQuantity },
        { header: "Lost", value: (row) => row.lostQuantity },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.id}
      metrics={
        query.data
          ? [
              { label: "Draft + received", value: String(query.data.outstandingCount) },
              { label: "Completed", value: String(query.data.completedCount) },
              { label: "Damaged qty", value: String(query.data.totalDamaged) },
              { label: "Lost qty", value: String(query.data.totalLost) },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on inspection date"
          />
          <StatusFilter
            value={params.status}
            onChange={setStatusFilter}
            options={RETURN_REPORT_STATUS_OPTIONS}
          />
        </>
      }
    />
  );
}

export function RepairReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setStatusFilter,
    setWarehouseFilter,
    clearAllFilters,
  } = useOperationalListReportParams();
  const query = useRepairReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Repair date", () =>
      setDateRange(undefined, undefined),
    ),
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<RepairReportLine>
      title="Repairs Report"
      description="Repair jobs by repair date. Job costs are not posted expenses or journals."
      breadcrumb="Repairs"
      searchPlaceholder="Search repair number, product, or status..."
      emptyTitle="No repair data"
      emptyDescription="Repair jobs will appear here."
      columns={getRepairReportColumns()}
      csvFilename="repairs-report.csv"
      csvColumns={[
        { header: "Repair", value: (row) => row.repairNumber },
        { header: "Product", value: (row) => row.productName },
        { header: "Status", value: (row) => row.status },
        { header: "Repair date", value: (row) => row.repairDate },
        { header: "Turnaround days", value: (row) => row.turnaroundDays },
        { header: "Estimated cost", value: (row) => row.estimatedCost },
        { header: "Actual cost", value: (row) => row.actualCost },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.id}
      metrics={
        query.data
          ? [
              {
                label: "Avg turnaround (d)",
                value:
                  query.data.averageTurnaroundDays == null
                    ? "—"
                    : String(query.data.averageTurnaroundDays),
              },
              {
                label: "Status groups",
                value: String(query.data.statusCounts.length),
              },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on repair date"
          />
          <StatusFilter
            value={params.status}
            onChange={setStatusFilter}
            options={REPAIR_REPORT_STATUS_OPTIONS}
          />
          <WarehouseFilter value={params.warehouseId} onChange={setWarehouseFilter} />
        </>
      }
    />
  );
}

export function MaintenanceReportPage() {
  const {
    params,
    localSearch,
    setLocalSearch,
    setSearch,
    setPage,
    setDateRange,
    setStatusFilter,
    setWarehouseFilter,
    clearAllFilters,
  } = useOperationalListReportParams();
  const query = useMaintenanceReport(params);
  const activeFilters = compactActiveFilters([
    params.search
      ? {
          id: "search",
          label: `Search: ${params.search}`,
          onClear: () => {
            setLocalSearch("");
            setSearch("");
          },
        }
      : null,
    dateRangeFilterChip(params.dateFrom, params.dateTo, "Scheduled date", () =>
      setDateRange(undefined, undefined),
    ),
    params.status
      ? {
          id: "status",
          label: `Status: ${params.status}`,
          onClear: () => setStatusFilter(undefined),
        }
      : null,
    params.warehouseId
      ? {
          id: "warehouse",
          label: "Warehouse",
          onClear: () => setWarehouseFilter(undefined),
        }
      : null,
  ]);

  return (
    <OperationalListReportShell<MaintenanceReportLine>
      title="Maintenance Report"
      description="Maintenance jobs by scheduled date. Job costs are not posted expenses or journals."
      breadcrumb="Maintenance"
      searchPlaceholder="Search number, product, status, or service type..."
      emptyTitle="No maintenance data"
      emptyDescription="Maintenance schedules will appear here."
      columns={getMaintenanceReportColumns()}
      csvFilename="maintenance-report.csv"
      csvColumns={[
        { header: "Maintenance", value: (row) => row.maintenanceNumber },
        { header: "Product", value: (row) => row.productName },
        { header: "Status", value: (row) => row.status },
        { header: "Service type", value: (row) => row.serviceType },
        { header: "Scheduled", value: (row) => row.scheduledDate },
        { header: "Estimated cost", value: (row) => row.estimatedCost },
        { header: "Actual cost", value: (row) => row.actualCost },
      ]}
      rows={query.data?.lines ?? []}
      getRowId={(row) => row.id}
      metrics={
        query.data
          ? [
              { label: "Upcoming", value: String(query.data.upcomingCount) },
              { label: "Completed", value: String(query.data.completedCount) },
            ]
          : undefined
      }
      pagination={query.data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      isFetching={query.isFetching}
      onRefresh={() => void query.refetch()}
      localSearch={localSearch}
      setLocalSearch={setLocalSearch}
      paramsSearch={params.search}
      setSearch={setSearch}
      setPage={setPage}
      activeFilters={activeFilters}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={activeFilters.length > 0}
      filters={
        <>
          <DateRangeFilters
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onChange={setDateRange}
            fieldHint="Filters on scheduled date"
          />
          <StatusFilter
            value={params.status}
            onChange={setStatusFilter}
            options={MAINTENANCE_REPORT_STATUS_OPTIONS}
          />
          <WarehouseFilter value={params.warehouseId} onChange={setWarehouseFilter} />
        </>
      }
    />
  );
}
