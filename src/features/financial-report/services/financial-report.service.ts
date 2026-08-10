import type {
  BalanceSheetParams,
  BalanceSheetResponse,
  CashFlowResponse,
  CustomerReportParams,
  CustomerReportResponse,
  DateRangeParams,
  DispatchReportResponse,
  ExpenseSummaryResponse,
  InventoryReportParams,
  InventoryReportResponse,
  MaintenanceReportResponse,
  OperationalReportListParams,
  ProcurementReportResponse,
  ProductReportParams,
  ProductReportResponse,
  ProfitLossResponse,
  RentalReportParams,
  RentalReportResponse,
  RepairReportResponse,
  ReturnReportResponse,
  RevenueSummaryResponse,
  SupplierReportResponse,
  WarehouseReportResponse,
} from "../types";
import { apiGet } from "@/lib/api";

const FINANCIAL_BASE = "/financial-reports";
const REPORTS_BASE = "/reports";

export async function getProfitLoss(
  params: DateRangeParams = {},
): Promise<ProfitLossResponse> {
  return apiGet<ProfitLossResponse>(`${FINANCIAL_BASE}/profit-loss`, { params });
}

export async function getBalanceSheet(
  params: BalanceSheetParams = {},
): Promise<BalanceSheetResponse> {
  return apiGet<BalanceSheetResponse>(`${FINANCIAL_BASE}/balance-sheet`, { params });
}

export async function getCashFlow(
  params: DateRangeParams = {},
): Promise<CashFlowResponse> {
  return apiGet<CashFlowResponse>(`${FINANCIAL_BASE}/cash-flow`, { params });
}

export async function getRevenueReport(
  params: DateRangeParams = {},
): Promise<RevenueSummaryResponse> {
  return apiGet<RevenueSummaryResponse>(`${FINANCIAL_BASE}/revenue`, { params });
}

export async function getExpenseReport(
  params: DateRangeParams = {},
): Promise<ExpenseSummaryResponse> {
  return apiGet<ExpenseSummaryResponse>(`${FINANCIAL_BASE}/expenses`, { params });
}

export async function getRentalReport(
  params: RentalReportParams = {},
): Promise<RentalReportResponse> {
  return apiGet<RentalReportResponse>(`${REPORTS_BASE}/rentals`, { params });
}

export async function getInventoryReport(
  params: InventoryReportParams = {},
): Promise<InventoryReportResponse> {
  return apiGet<InventoryReportResponse>(`${REPORTS_BASE}/inventory`, { params });
}

export async function getCustomerReport(
  params: CustomerReportParams = {},
): Promise<CustomerReportResponse> {
  return apiGet<CustomerReportResponse>(`${REPORTS_BASE}/customers`, { params });
}

export async function getProductReport(
  params: ProductReportParams = {},
): Promise<ProductReportResponse> {
  return apiGet<ProductReportResponse>(`${REPORTS_BASE}/products`, { params });
}

export async function getSupplierReport(
  params: OperationalReportListParams = {},
): Promise<SupplierReportResponse> {
  return apiGet<SupplierReportResponse>(`${REPORTS_BASE}/suppliers`, { params });
}

export async function getWarehouseReport(
  params: OperationalReportListParams = {},
): Promise<WarehouseReportResponse> {
  return apiGet<WarehouseReportResponse>(`${REPORTS_BASE}/warehouses`, { params });
}

export async function getProcurementReport(
  params: OperationalReportListParams = {},
): Promise<ProcurementReportResponse> {
  return apiGet<ProcurementReportResponse>(`${REPORTS_BASE}/procurement`, { params });
}

export async function getDispatchReport(
  params: OperationalReportListParams = {},
): Promise<DispatchReportResponse> {
  return apiGet<DispatchReportResponse>(`${REPORTS_BASE}/dispatches`, { params });
}

export async function getReturnReport(
  params: OperationalReportListParams = {},
): Promise<ReturnReportResponse> {
  return apiGet<ReturnReportResponse>(`${REPORTS_BASE}/returns`, { params });
}

export async function getRepairReport(
  params: OperationalReportListParams = {},
): Promise<RepairReportResponse> {
  return apiGet<RepairReportResponse>(`${REPORTS_BASE}/repairs`, { params });
}

export async function getMaintenanceReport(
  params: OperationalReportListParams = {},
): Promise<MaintenanceReportResponse> {
  return apiGet<MaintenanceReportResponse>(`${REPORTS_BASE}/maintenance`, { params });
}
