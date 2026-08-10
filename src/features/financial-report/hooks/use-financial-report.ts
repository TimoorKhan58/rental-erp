import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  BalanceSheetParams,
  CustomerReportParams,
  DateRangeParams,
  InventoryReportParams,
  OperationalReportListParams,
  ProductReportParams,
  RentalReportParams,
} from "../types";
import {
  getBalanceSheet,
  getCashFlow,
  getCustomerReport,
  getDispatchReport,
  getExpenseReport,
  getInventoryReport,
  getMaintenanceReport,
  getProcurementReport,
  getProductReport,
  getProfitLoss,
  getRentalReport,
  getRepairReport,
  getReturnReport,
  getRevenueReport,
  getSupplierReport,
  getWarehouseReport,
} from "../services";

export function useFinancialReportPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];
  const canRead =
    permissions.includes(PERMISSIONS.financialReports.read) ||
    permissions.includes(PERMISSIONS.reports.read);

  return {
    isLoading,
    canReadFinancial: permissions.includes(PERMISSIONS.financialReports.read),
    canReadOperational: permissions.includes(PERMISSIONS.reports.read),
    canRead,
    /** Client-side CSV export is available whenever the user can read reports. */
    canExport: canRead,
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

export function useProductReport(params: ProductReportParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.products(params),
    queryFn: () => getProductReport(params),
  });
}

export function useSupplierReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.suppliers(params),
    queryFn: () => getSupplierReport(params),
  });
}

export function useWarehouseReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.warehouses(params),
    queryFn: () => getWarehouseReport(params),
  });
}

export function useProcurementReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.procurement(params),
    queryFn: () => getProcurementReport(params),
  });
}

export function useDispatchReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.dispatches(params),
    queryFn: () => getDispatchReport(params),
  });
}

export function useReturnReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.returns(params),
    queryFn: () => getReturnReport(params),
  });
}

export function useRepairReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.repairs(params),
    queryFn: () => getRepairReport(params),
  });
}

export function useMaintenanceReport(params: OperationalReportListParams = {}) {
  return useQuery({
    queryKey: queryKeys.reports.maintenance(params),
    queryFn: () => getMaintenanceReport(params),
  });
}
