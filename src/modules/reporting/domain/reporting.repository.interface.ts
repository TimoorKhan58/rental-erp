import type {
  AnalyticsOverviewQuery,
  CustomerReportQuery,
  DashboardQuery,
  RentalInsightsQuery,
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
  AnalyticsOperationalSnapshot,
  CustomerReport,
  DashboardSummary,
  RentalInsightsReport,
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
  getAnalyticsOverview(
    query: AnalyticsOverviewQuery,
  ): Promise<AnalyticsOperationalSnapshot>;
  getRentalInsights(query: RentalInsightsQuery): Promise<RentalInsightsReport>;
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
