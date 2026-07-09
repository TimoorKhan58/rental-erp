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
} from "@/modules/reporting/application/dtos/reporting.dto";

export function toDashboardResponse(dto: DashboardSummaryDto): DashboardSummaryDto {
  return dto;
}

export function toInventoryReportResponse(
  dto: InventoryReportDto,
): InventoryReportDto {
  return dto;
}

export function toRentalReportResponse(dto: RentalReportDto): RentalReportDto {
  return dto;
}

export function toDispatchReportResponse(
  dto: DispatchReportDto,
): DispatchReportDto {
  return dto;
}

export function toReturnReportResponse(dto: ReturnReportDto): ReturnReportDto {
  return dto;
}

export function toRepairReportResponse(dto: RepairReportDto): RepairReportDto {
  return dto;
}

export function toMaintenanceReportResponse(
  dto: MaintenanceReportDto,
): MaintenanceReportDto {
  return dto;
}

export function toProcurementReportResponse(
  dto: ProcurementReportDto,
): ProcurementReportDto {
  return dto;
}

export function toCustomerReportResponse(
  dto: CustomerReportDto,
): CustomerReportDto {
  return dto;
}

export function toSupplierReportResponse(
  dto: SupplierReportDto,
): SupplierReportDto {
  return dto;
}

export function toWarehouseReportResponse(
  dto: WarehouseReportDto,
): WarehouseReportDto {
  return dto;
}

export function toProductReportResponse(dto: ProductReportDto): ProductReportDto {
  return dto;
}
