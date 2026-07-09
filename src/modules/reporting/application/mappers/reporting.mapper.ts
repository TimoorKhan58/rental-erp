import type {
  CustomerReportQuery,
  DashboardQuery,
  DispatchReportQuery,
  InventoryReportQuery,
  MaintenanceReportQuery,
  ProcurementReportQuery,
  ProductReportQuery,
  RentalReportQuery,
  RepairReportQuery,
  ReturnReportQuery,
  SupplierReportQuery,
  WarehouseReportQuery,
} from "@/modules/reporting/domain/reporting.queries";
import type {
  CustomerReport,
  DashboardSummary,
  DispatchReport,
  InventoryReport,
  MaintenanceReport,
  ProcurementReport,
  ProductReport,
  RentalReport,
  RepairReport,
  ReturnReport,
  SupplierReport,
  WarehouseReport,
} from "@/modules/reporting/domain/reporting.types";

import type {
  CustomerReportDto,
  DashboardSummaryDto,
  DispatchReportDto,
  InventoryReportDto,
  MaintenanceReportDto,
  ProcurementReportDto,
  ProductReportDto,
  RentalReportDto,
  RepairReportDto,
  ReturnReportDto,
  SupplierReportDto,
  WarehouseReportDto,
} from "../dtos/reporting.dto";
import type {
  CustomerReportQueryParsed,
  DashboardQueryParsed,
  DispatchReportQueryParsed,
  InventoryReportQueryParsed,
  MaintenanceReportQueryParsed,
  ProcurementReportQueryParsed,
  ProductReportQueryParsed,
  RentalReportQueryParsed,
  RepairReportQueryParsed,
  ReturnReportQueryParsed,
  SupplierReportQueryParsed,
  WarehouseReportQueryParsed,
} from "../schemas/reporting.schemas";

function toIso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

function toIsoRequired(value: Date): string {
  return value.toISOString();
}

export function toDashboardQuery(input: DashboardQueryParsed): DashboardQuery {
  return { dateFrom: input.dateFrom, dateTo: input.dateTo };
}

export function toInventoryReportQuery(
  input: InventoryReportQueryParsed,
): InventoryReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    warehouseId: input.warehouseId,
    lowStockOnly: input.lowStockOnly,
    overstockOnly: input.overstockOnly,
  };
}

export function toRentalReportQuery(
  input: RentalReportQueryParsed,
): RentalReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    customerId: input.customerId,
    warehouseId: input.warehouseId,
    status: input.status,
  };
}

export function toDispatchReportQuery(
  input: DispatchReportQueryParsed,
): DispatchReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    status: input.status,
  };
}

export function toReturnReportQuery(
  input: ReturnReportQueryParsed,
): ReturnReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    status: input.status,
  };
}

export function toRepairReportQuery(
  input: RepairReportQueryParsed,
): RepairReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    status: input.status,
    warehouseId: input.warehouseId,
  };
}

export function toMaintenanceReportQuery(
  input: MaintenanceReportQueryParsed,
): MaintenanceReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    status: input.status,
    warehouseId: input.warehouseId,
  };
}

export function toProcurementReportQuery(
  input: ProcurementReportQueryParsed,
): ProcurementReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    supplierId: input.supplierId,
    warehouseId: input.warehouseId,
    status: input.status,
  };
}

export function toCustomerReportQuery(
  input: CustomerReportQueryParsed,
): CustomerReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    customerId: input.customerId,
  };
}

export function toSupplierReportQuery(
  input: SupplierReportQueryParsed,
): SupplierReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    supplierId: input.supplierId,
  };
}

export function toWarehouseReportQuery(
  input: WarehouseReportQueryParsed,
): WarehouseReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    warehouseId: input.warehouseId,
  };
}

export function toProductReportQuery(
  input: ProductReportQueryParsed,
): ProductReportQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
}

export function toDashboardDto(report: DashboardSummary): DashboardSummaryDto {
  return { ...report };
}

export function toInventoryReportDto(report: InventoryReport): InventoryReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({ ...line })),
  };
}

export function toRentalReportDto(report: RentalReport): RentalReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      bookingDate: toIsoRequired(line.bookingDate),
      eventStartDate: toIsoRequired(line.eventStartDate),
      eventEndDate: toIsoRequired(line.eventEndDate),
      expectedReturnDate: toIsoRequired(line.expectedReturnDate),
      actualReturnDate: toIso(line.actualReturnDate),
    })),
  };
}

export function toDispatchReportDto(report: DispatchReport): DispatchReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      dispatchDate: toIsoRequired(line.dispatchDate),
      loadedAt: toIso(line.loadedAt),
      departedAt: toIso(line.departedAt),
      deliveredAt: toIso(line.deliveredAt),
    })),
  };
}

export function toReturnReportDto(report: ReturnReport): ReturnReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      inspectionDate: toIsoRequired(line.inspectionDate),
      receivedAt: toIso(line.receivedAt),
      completedAt: toIso(line.completedAt),
    })),
  };
}

export function toRepairReportDto(report: RepairReport): RepairReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      repairDate: toIsoRequired(line.repairDate),
      startedAt: toIso(line.startedAt),
      completedAt: toIso(line.completedAt),
    })),
  };
}

export function toMaintenanceReportDto(
  report: MaintenanceReport,
): MaintenanceReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      scheduledDate: toIsoRequired(line.scheduledDate),
      startedAt: toIso(line.startedAt),
      completedAt: toIso(line.completedAt),
    })),
  };
}

export function toProcurementReportDto(
  report: ProcurementReport,
): ProcurementReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      orderDate: toIsoRequired(line.orderDate),
      expectedDate: toIso(line.expectedDate),
    })),
  };
}

export function toCustomerReportDto(report: CustomerReport): CustomerReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      lastOrderDate: toIso(line.lastOrderDate),
    })),
  };
}

export function toSupplierReportDto(report: SupplierReport): SupplierReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({
      ...line,
      lastOrderDate: toIso(line.lastOrderDate),
    })),
  };
}

export function toWarehouseReportDto(
  report: WarehouseReport,
): WarehouseReportDto {
  return {
    ...report,
    lines: report.lines.map((line) => ({ ...line })),
  };
}

export function toProductReportDto(report: ProductReport): ProductReportDto {
  const mapLine = (line: ProductReport["lines"][number]) => ({ ...line });
  return {
    ...report,
    lines: report.lines.map(mapLine),
    mostRented: report.mostRented.map(mapLine),
    leastRented: report.leastRented.map(mapLine),
  };
}
