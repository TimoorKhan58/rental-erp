import type {
  BalanceSheetParams,
  BalanceSheetResponse,
  CashFlowResponse,
  CustomerReportParams,
  CustomerReportResponse,
  DateRangeParams,
  ExpenseSummaryResponse,
  InventoryReportParams,
  InventoryReportResponse,
  ProfitLossResponse,
  RentalReportParams,
  RentalReportResponse,
  RevenueSummaryResponse,
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
