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
  CustomerReportQueryInput,
  DashboardQueryInput,
  DispatchReportQueryInput,
  InventoryReportQueryInput,
  MaintenanceReportQueryInput,
  ProcurementReportQueryInput,
  ProductReportQueryInput,
  RentalReportQueryInput,
  RepairReportQueryInput,
  ReturnReportQueryInput,
  SupplierReportQueryInput,
  WarehouseReportQueryInput,
} from "../schemas/reporting.schemas";
import type { GetCustomerReportService } from "./get-customer-report.service";
import type { GetDashboardService } from "./get-dashboard.service";
import type { GetDispatchReportService } from "./get-dispatch-report.service";
import type { GetInventoryReportService } from "./get-inventory-report.service";
import type { GetMaintenanceReportService } from "./get-maintenance-report.service";
import type { GetProcurementReportService } from "./get-procurement-report.service";
import type { GetProductReportService } from "./get-product-report.service";
import type { GetRentalReportService } from "./get-rental-report.service";
import type { GetRepairReportService } from "./get-repair-report.service";
import type { GetReturnReportService } from "./get-return-report.service";
import type { GetSupplierReportService } from "./get-supplier-report.service";
import type { GetWarehouseReportService } from "./get-warehouse-report.service";

export interface ReportingApplicationServices {
  getDashboard: GetDashboardService;
  getInventoryReport: GetInventoryReportService;
  getRentalReport: GetRentalReportService;
  getDispatchReport: GetDispatchReportService;
  getReturnReport: GetReturnReportService;
  getRepairReport: GetRepairReportService;
  getMaintenanceReport: GetMaintenanceReportService;
  getProcurementReport: GetProcurementReportService;
  getCustomerReport: GetCustomerReportService;
  getSupplierReport: GetSupplierReportService;
  getWarehouseReport: GetWarehouseReportService;
  getProductReport: GetProductReportService;
}

export type ReportingServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => ReportingApplicationServices;

export interface IReportingService {
  getDashboard(input: DashboardQueryInput): Promise<DashboardSummaryDto>;
  getInventoryReport(
    input: InventoryReportQueryInput,
  ): Promise<InventoryReportDto>;
  getRentalReport(input: RentalReportQueryInput): Promise<RentalReportDto>;
  getDispatchReport(
    input: DispatchReportQueryInput,
  ): Promise<DispatchReportDto>;
  getReturnReport(input: ReturnReportQueryInput): Promise<ReturnReportDto>;
  getRepairReport(input: RepairReportQueryInput): Promise<RepairReportDto>;
  getMaintenanceReport(
    input: MaintenanceReportQueryInput,
  ): Promise<MaintenanceReportDto>;
  getProcurementReport(
    input: ProcurementReportQueryInput,
  ): Promise<ProcurementReportDto>;
  getCustomerReport(
    input: CustomerReportQueryInput,
  ): Promise<CustomerReportDto>;
  getSupplierReport(
    input: SupplierReportQueryInput,
  ): Promise<SupplierReportDto>;
  getWarehouseReport(
    input: WarehouseReportQueryInput,
  ): Promise<WarehouseReportDto>;
  getProductReport(input: ProductReportQueryInput): Promise<ProductReportDto>;
}
