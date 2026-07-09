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
} from "./reporting.queries";
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
} from "./reporting.types";

export interface IReportingRepository {
  getDashboard(query: DashboardQuery): Promise<DashboardSummary>;
  getInventoryReport(query: InventoryReportQuery): Promise<InventoryReport>;
  getRentalReport(query: RentalReportQuery): Promise<RentalReport>;
  getDispatchReport(query: DispatchReportQuery): Promise<DispatchReport>;
  getReturnReport(query: ReturnReportQuery): Promise<ReturnReport>;
  getRepairReport(query: RepairReportQuery): Promise<RepairReport>;
  getMaintenanceReport(
    query: MaintenanceReportQuery,
  ): Promise<MaintenanceReport>;
  getProcurementReport(
    query: ProcurementReportQuery,
  ): Promise<ProcurementReport>;
  getCustomerReport(query: CustomerReportQuery): Promise<CustomerReport>;
  getSupplierReport(query: SupplierReportQuery): Promise<SupplierReport>;
  getWarehouseReport(query: WarehouseReportQuery): Promise<WarehouseReport>;
  getProductReport(query: ProductReportQuery): Promise<ProductReport>;
}
