import type {
  CustomerReportSortField,
  DispatchReportSortField,
  InventoryReportSortField,
  MaintenanceReportSortField,
  ProcurementReportSortField,
  ProductReportSortField,
  RentalReportSortField,
  RepairReportSortField,
  ReturnReportSortField,
  SupplierReportSortField,
  WarehouseReportSortField,
} from "./reporting.constants";

export interface DateRangeQuery {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedReportQuery {
  page: number;
  pageSize: number;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export type DashboardQuery = DateRangeQuery;

export interface InventoryReportQuery extends PaginatedReportQuery, DateRangeQuery {
  warehouseId?: string;
  lowStockOnly?: boolean;
  overstockOnly?: boolean;
  sortBy?: InventoryReportSortField;
}

export interface RentalReportQuery extends PaginatedReportQuery, DateRangeQuery {
  customerId?: string;
  warehouseId?: string;
  status?: string;
  sortBy?: RentalReportSortField;
}

export interface DispatchReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  status?: string;
  sortBy?: DispatchReportSortField;
}

export interface ReturnReportQuery extends PaginatedReportQuery, DateRangeQuery {
  status?: string;
  sortBy?: ReturnReportSortField;
}

export interface RepairReportQuery extends PaginatedReportQuery, DateRangeQuery {
  status?: string;
  warehouseId?: string;
  sortBy?: RepairReportSortField;
}

export interface MaintenanceReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  status?: string;
  warehouseId?: string;
  sortBy?: MaintenanceReportSortField;
}

export interface ProcurementReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  supplierId?: string;
  warehouseId?: string;
  status?: string;
  sortBy?: ProcurementReportSortField;
}

export interface CustomerReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  customerId?: string;
  sortBy?: CustomerReportSortField;
}

export interface SupplierReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  supplierId?: string;
  sortBy?: SupplierReportSortField;
}

export interface WarehouseReportQuery extends PaginatedReportQuery {
  warehouseId?: string;
  sortBy?: WarehouseReportSortField;
}

export interface ProductReportQuery
  extends PaginatedReportQuery,
    DateRangeQuery {
  sortBy?: ProductReportSortField;
}
