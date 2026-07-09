import { z } from "zod";

import {
  BooleanStringSchema,
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  CUSTOMER_REPORT_SORT_FIELDS,
  DISPATCH_REPORT_SORT_FIELDS,
  INVENTORY_REPORT_SORT_FIELDS,
  MAINTENANCE_REPORT_SORT_FIELDS,
  PROCUREMENT_REPORT_SORT_FIELDS,
  PRODUCT_REPORT_SORT_FIELDS,
  RENTAL_REPORT_SORT_FIELDS,
  REPAIR_REPORT_SORT_FIELDS,
  RETURN_REPORT_SORT_FIELDS,
  SUPPLIER_REPORT_SORT_FIELDS,
  WAREHOUSE_REPORT_SORT_FIELDS,
} from "@/modules/reporting/domain/reporting.constants";

const DateRangeRefine = (
  value: { dateFrom?: Date; dateTo?: Date },
  ctx: z.RefinementCtx,
) => {
  if (
    value.dateFrom !== undefined &&
    value.dateTo !== undefined &&
    value.dateFrom.getTime() > value.dateTo.getTime()
  ) {
    ctx.addIssue({
      code: "custom",
      message: "dateFrom must be on or before dateTo",
      path: ["dateFrom"],
    });
  }
};

const SearchRefine = (
  value: { search?: string },
  ctx: z.RefinementCtx,
) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
};

export const DashboardQuerySchema = z
  .object({
    dateFrom: DateSchema.optional(),
    dateTo: DateSchema.optional(),
  })
  .superRefine(DateRangeRefine);

export const InventoryReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  lowStockOnly: BooleanStringSchema.optional(),
  overstockOnly: BooleanStringSchema.optional(),
  sortBy: z.enum(INVENTORY_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const RentalReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  customerId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  status: z.string().trim().min(1).optional(),
  sortBy: z.enum(RENTAL_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const DispatchReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  status: z.string().trim().min(1).optional(),
  sortBy: z.enum(DISPATCH_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const ReturnReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  status: z.string().trim().min(1).optional(),
  sortBy: z.enum(RETURN_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const RepairReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  status: z.string().trim().min(1).optional(),
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(REPAIR_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const MaintenanceReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  status: z.string().trim().min(1).optional(),
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(MAINTENANCE_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const ProcurementReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  supplierId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  status: z.string().trim().min(1).optional(),
  sortBy: z.enum(PROCUREMENT_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const CustomerReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  customerId: UUIDSchema.optional(),
  sortBy: z.enum(CUSTOMER_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const SupplierReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  supplierId: UUIDSchema.optional(),
  sortBy: z.enum(SUPPLIER_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export const WarehouseReportQuerySchema = PaginationSchema.extend({
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(WAREHOUSE_REPORT_SORT_FIELDS).optional(),
}).superRefine(SearchRefine);

export const ProductReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  sortBy: z.enum(PRODUCT_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);
  SearchRefine(value, ctx);
});

export type DashboardQueryInput = z.input<typeof DashboardQuerySchema>;
export type InventoryReportQueryInput = z.input<
  typeof InventoryReportQuerySchema
>;
export type RentalReportQueryInput = z.input<typeof RentalReportQuerySchema>;
export type DispatchReportQueryInput = z.input<
  typeof DispatchReportQuerySchema
>;
export type ReturnReportQueryInput = z.input<typeof ReturnReportQuerySchema>;
export type RepairReportQueryInput = z.input<typeof RepairReportQuerySchema>;
export type MaintenanceReportQueryInput = z.input<
  typeof MaintenanceReportQuerySchema
>;
export type ProcurementReportQueryInput = z.input<
  typeof ProcurementReportQuerySchema
>;
export type CustomerReportQueryInput = z.input<
  typeof CustomerReportQuerySchema
>;
export type SupplierReportQueryInput = z.input<
  typeof SupplierReportQuerySchema
>;
export type WarehouseReportQueryInput = z.input<
  typeof WarehouseReportQuerySchema
>;
export type ProductReportQueryInput = z.input<typeof ProductReportQuerySchema>;

export type DashboardQueryParsed = z.infer<typeof DashboardQuerySchema>;
export type InventoryReportQueryParsed = z.infer<
  typeof InventoryReportQuerySchema
>;
export type RentalReportQueryParsed = z.infer<typeof RentalReportQuerySchema>;
export type DispatchReportQueryParsed = z.infer<
  typeof DispatchReportQuerySchema
>;
export type ReturnReportQueryParsed = z.infer<typeof ReturnReportQuerySchema>;
export type RepairReportQueryParsed = z.infer<typeof RepairReportQuerySchema>;
export type MaintenanceReportQueryParsed = z.infer<
  typeof MaintenanceReportQuerySchema
>;
export type ProcurementReportQueryParsed = z.infer<
  typeof ProcurementReportQuerySchema
>;
export type CustomerReportQueryParsed = z.infer<
  typeof CustomerReportQuerySchema
>;
export type SupplierReportQueryParsed = z.infer<
  typeof SupplierReportQuerySchema
>;
export type WarehouseReportQueryParsed = z.infer<
  typeof WarehouseReportQuerySchema
>;
export type ProductReportQueryParsed = z.infer<typeof ProductReportQuerySchema>;
