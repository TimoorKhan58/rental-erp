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
import type { IReportingService } from "./reporting-application-services.interface";
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

export class ReportingService implements IReportingService {
  constructor(
    private readonly getDashboardService: GetDashboardService,
    private readonly getInventoryReportService: GetInventoryReportService,
    private readonly getRentalReportService: GetRentalReportService,
    private readonly getDispatchReportService: GetDispatchReportService,
    private readonly getReturnReportService: GetReturnReportService,
    private readonly getRepairReportService: GetRepairReportService,
    private readonly getMaintenanceReportService: GetMaintenanceReportService,
    private readonly getProcurementReportService: GetProcurementReportService,
    private readonly getCustomerReportService: GetCustomerReportService,
    private readonly getSupplierReportService: GetSupplierReportService,
    private readonly getWarehouseReportService: GetWarehouseReportService,
    private readonly getProductReportService: GetProductReportService,
  ) {}

  getDashboard(input: DashboardQueryInput): Promise<DashboardSummaryDto> {
    return this.getDashboardService.execute(input);
  }

  getInventoryReport(
    input: InventoryReportQueryInput,
  ): Promise<InventoryReportDto> {
    return this.getInventoryReportService.execute(input);
  }

  getRentalReport(input: RentalReportQueryInput): Promise<RentalReportDto> {
    return this.getRentalReportService.execute(input);
  }

  getDispatchReport(
    input: DispatchReportQueryInput,
  ): Promise<DispatchReportDto> {
    return this.getDispatchReportService.execute(input);
  }

  getReturnReport(input: ReturnReportQueryInput): Promise<ReturnReportDto> {
    return this.getReturnReportService.execute(input);
  }

  getRepairReport(input: RepairReportQueryInput): Promise<RepairReportDto> {
    return this.getRepairReportService.execute(input);
  }

  getMaintenanceReport(
    input: MaintenanceReportQueryInput,
  ): Promise<MaintenanceReportDto> {
    return this.getMaintenanceReportService.execute(input);
  }

  getProcurementReport(
    input: ProcurementReportQueryInput,
  ): Promise<ProcurementReportDto> {
    return this.getProcurementReportService.execute(input);
  }

  getCustomerReport(
    input: CustomerReportQueryInput,
  ): Promise<CustomerReportDto> {
    return this.getCustomerReportService.execute(input);
  }

  getSupplierReport(
    input: SupplierReportQueryInput,
  ): Promise<SupplierReportDto> {
    return this.getSupplierReportService.execute(input);
  }

  getWarehouseReport(
    input: WarehouseReportQueryInput,
  ): Promise<WarehouseReportDto> {
    return this.getWarehouseReportService.execute(input);
  }

  getProductReport(input: ProductReportQueryInput): Promise<ProductReportDto> {
    return this.getProductReportService.execute(input);
  }
}
