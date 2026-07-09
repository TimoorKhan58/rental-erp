export const REPORTING_MODULE = "reports";

export const REPORT_SORT_ORDERS = ["asc", "desc"] as const;

export const INVENTORY_REPORT_SORT_FIELDS = [
  "productCode",
  "warehouseCode",
  "quantityOnHand",
  "availableQuantity",
  "inventoryValue",
] as const;

export type InventoryReportSortField =
  (typeof INVENTORY_REPORT_SORT_FIELDS)[number];

export const RENTAL_REPORT_SORT_FIELDS = [
  "orderNumber",
  "bookingDate",
  "eventStartDate",
  "status",
  "grandTotal",
  "createdAt",
] as const;

export type RentalReportSortField = (typeof RENTAL_REPORT_SORT_FIELDS)[number];

export const DISPATCH_REPORT_SORT_FIELDS = [
  "dispatchNumber",
  "dispatchDate",
  "status",
  "createdAt",
] as const;

export type DispatchReportSortField =
  (typeof DISPATCH_REPORT_SORT_FIELDS)[number];

export const RETURN_REPORT_SORT_FIELDS = [
  "returnNumber",
  "inspectionDate",
  "status",
  "createdAt",
] as const;

export type ReturnReportSortField = (typeof RETURN_REPORT_SORT_FIELDS)[number];

export const REPAIR_REPORT_SORT_FIELDS = [
  "repairNumber",
  "repairDate",
  "status",
  "createdAt",
] as const;

export type RepairReportSortField = (typeof REPAIR_REPORT_SORT_FIELDS)[number];

export const MAINTENANCE_REPORT_SORT_FIELDS = [
  "maintenanceNumber",
  "scheduledDate",
  "status",
  "createdAt",
] as const;

export type MaintenanceReportSortField =
  (typeof MAINTENANCE_REPORT_SORT_FIELDS)[number];

export const PROCUREMENT_REPORT_SORT_FIELDS = [
  "poNumber",
  "orderDate",
  "status",
  "createdAt",
] as const;

export type ProcurementReportSortField =
  (typeof PROCUREMENT_REPORT_SORT_FIELDS)[number];

export const CUSTOMER_REPORT_SORT_FIELDS = [
  "customerCode",
  "name",
  "orderCount",
  "revenue",
] as const;

export type CustomerReportSortField =
  (typeof CUSTOMER_REPORT_SORT_FIELDS)[number];

export const SUPPLIER_REPORT_SORT_FIELDS = [
  "supplierCode",
  "name",
  "purchaseOrderCount",
  "purchaseTotal",
] as const;

export type SupplierReportSortField =
  (typeof SUPPLIER_REPORT_SORT_FIELDS)[number];

export const WAREHOUSE_REPORT_SORT_FIELDS = [
  "warehouseCode",
  "name",
  "inventoryQuantity",
  "inventoryValue",
] as const;

export type WarehouseReportSortField =
  (typeof WAREHOUSE_REPORT_SORT_FIELDS)[number];

export const PRODUCT_REPORT_SORT_FIELDS = [
  "productCode",
  "name",
  "rentalCount",
  "rentedQuantity",
] as const;

export type ProductReportSortField = (typeof PRODUCT_REPORT_SORT_FIELDS)[number];

export const LOW_STOCK_DEFAULT_THRESHOLD = 0;
