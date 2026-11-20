import type {
  AnalyticsOverviewDto,
  CustomerReportDto,
  DashboardSummaryDto,
  DispatchReportDto,
  InventoryReportDto,
  MaintenanceReportDto,
  ProcurementReportDto,
  ProductReportDto,
  RentalInsightsReportDto,
  RentalReportDto,
  RepairReportDto,
  ReturnReportDto,
  SupplierReportDto,
  WarehouseReportDto,
} from "@/modules/reporting/application/dtos/reporting.dto";

export function toDashboardResponse(dto: DashboardSummaryDto): DashboardSummaryDto {
  return dto;
}

/**
 * Workers run the stock side and must not see money (owner's decision,
 * 2026-11-20): invoice counts, amounts to collect, this month's billing and
 * stock value are blanked before the dashboard leaves the server.
 */
export function withoutDashboardMoney(dto: DashboardSummaryDto): DashboardSummaryDto {
  return {
    ...dto,
    inventoryValue: 0,
    outstandingInvoices: 0,
    paidInvoices: 0,
    revenueThisMonth: 0,
    paymentsThisMonth: 0,
    worklist: {
      ...dto.worklist,
      unpaidInvoices: 0,
      overdueInvoices: 0,
      oldestOverdueDays: null,
      amountToCollect: 0,
    },
    moneyHidden: true,
  };
}

export function toAnalyticsOverviewResponse(
  dto: AnalyticsOverviewDto,
): AnalyticsOverviewDto {
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

export function toRentalInsightsResponse(
  dto: RentalInsightsReportDto,
): RentalInsightsReportDto {
  return dto;
}
