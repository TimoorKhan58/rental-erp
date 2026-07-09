import type { ReportingApplicationServices as ReportingApplicationServicesBase } from "@/modules/reporting/application/services/reporting-application-services.interface";
import { ReportingService } from "@/modules/reporting/application/services/reporting.service";
import type { IReportingService } from "@/modules/reporting/application/services/reporting-application-services.interface";
import { GetCustomerReportService } from "@/modules/reporting/application/services/get-customer-report.service";
import { GetDashboardService } from "@/modules/reporting/application/services/get-dashboard.service";
import { GetDispatchReportService } from "@/modules/reporting/application/services/get-dispatch-report.service";
import { GetInventoryReportService } from "@/modules/reporting/application/services/get-inventory-report.service";
import { GetMaintenanceReportService } from "@/modules/reporting/application/services/get-maintenance-report.service";
import { GetProcurementReportService } from "@/modules/reporting/application/services/get-procurement-report.service";
import { GetProductReportService } from "@/modules/reporting/application/services/get-product-report.service";
import { GetRentalReportService } from "@/modules/reporting/application/services/get-rental-report.service";
import { GetRepairReportService } from "@/modules/reporting/application/services/get-repair-report.service";
import { GetReturnReportService } from "@/modules/reporting/application/services/get-return-report.service";
import { GetSupplierReportService } from "@/modules/reporting/application/services/get-supplier-report.service";
import { GetWarehouseReportService } from "@/modules/reporting/application/services/get-warehouse-report.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createReportingRepositoryFromSharedDeps } from "./create-reporting.repository";

export type { ReportingApplicationServicesBase as ReportingApplicationServices };

export interface WiredReportingApplicationServices
  extends ReportingApplicationServicesBase {
  reportingService: IReportingService;
}

export function createReportingApplicationServices(
  deps: SharedDeps,
): WiredReportingApplicationServices {
  const reportingRepository = createReportingRepositoryFromSharedDeps(deps);

  const getDashboard = new GetDashboardService(reportingRepository);
  const getInventoryReport = new GetInventoryReportService(reportingRepository);
  const getRentalReport = new GetRentalReportService(reportingRepository);
  const getDispatchReport = new GetDispatchReportService(reportingRepository);
  const getReturnReport = new GetReturnReportService(reportingRepository);
  const getRepairReport = new GetRepairReportService(reportingRepository);
  const getMaintenanceReport = new GetMaintenanceReportService(
    reportingRepository,
  );
  const getProcurementReport = new GetProcurementReportService(
    reportingRepository,
  );
  const getCustomerReport = new GetCustomerReportService(reportingRepository);
  const getSupplierReport = new GetSupplierReportService(reportingRepository);
  const getWarehouseReport = new GetWarehouseReportService(reportingRepository);
  const getProductReport = new GetProductReportService(reportingRepository);

  return {
    getDashboard,
    getInventoryReport,
    getRentalReport,
    getDispatchReport,
    getReturnReport,
    getRepairReport,
    getMaintenanceReport,
    getProcurementReport,
    getCustomerReport,
    getSupplierReport,
    getWarehouseReport,
    getProductReport,
    reportingService: new ReportingService(
      getDashboard,
      getInventoryReport,
      getRentalReport,
      getDispatchReport,
      getReturnReport,
      getRepairReport,
      getMaintenanceReport,
      getProcurementReport,
      getCustomerReport,
      getSupplierReport,
      getWarehouseReport,
      getProductReport,
    ),
  };
}
