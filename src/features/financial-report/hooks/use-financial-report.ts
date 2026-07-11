import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  BalanceSheetParams,
  CustomerReportParams,
  DateRangeParams,
  InventoryReportParams,
  RentalReportParams,
} from "../types";
import {
  getBalanceSheet,
  getCashFlow,
  getCustomerReport,
  getExpenseReport,
  getInventoryReport,
  getProfitLoss,
  getRentalReport,
  getRevenueReport,
} from "../services";

export function useFinancialReportPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canReadFinancial: permissions.includes(PERMISSIONS.financialReports.read),
    canReadOperational: permissions.includes(PERMISSIONS.reports.read),
    canRead:
      permissions.includes(PERMISSIONS.financialReports.read) ||
      permissions.includes(PERMISSIONS.reports.read),
    /** Backend has no reports:export permission — export UI is a placeholder only. */
    canExport: false,
  };
}

export function useProfitLoss(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports.profitLoss(params),
    queryFn: () => getProfitLoss(params),
  });
}

export function useBalanceSheet(params: BalanceSheetParams = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports.balanceSheet(params),
    queryFn: () => getBalanceSheet(params),
  });
}

export function useCashFlow(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports.cashFlow(params),
    queryFn: () => getCashFlow(params),
  });
}

export function useRevenueReport(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports.revenue(params),
    queryFn: () => getRevenueReport(params),
  });
}

export function useExpenseReport(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.financialReports.expenses(params),
    queryFn: () => getExpenseReport(params),
  });
}

export function useRentalReport(params: RentalReportParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.rentals(params),
    queryFn: () => getRentalReport(params),
  });
}

export function useInventoryReport(params: InventoryReportParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.inventory(params),
    queryFn: () => getInventoryReport(params),
  });
}

export function useCustomerReport(params: CustomerReportParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.customers(params),
    queryFn: () => getCustomerReport(params),
  });
}
