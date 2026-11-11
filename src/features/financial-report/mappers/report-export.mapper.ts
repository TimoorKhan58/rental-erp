import type { CsvColumnDef } from "@/lib/utils";

import type {
  BalanceSheetResponse,
  CashFlowResponse,
  CustomerReportLine,
  ExpenseSummaryLine,
  ProfitLossAccountLine,
  ProfitLossResponse,
  RentalReportLine,
  RevenueSummaryLine,
} from "../types";

export const PROFIT_LOSS_ACCOUNT_CSV_COLUMNS: Array<
  CsvColumnDef<ProfitLossAccountLine>
> = [
  { header: "Account code", value: (row) => row.accountCode },
  { header: "Account name", value: (row) => row.accountName },
  { header: "Amount", value: (row) => row.amount },
];

export const REVENUE_SUMMARY_CSV_COLUMNS: Array<CsvColumnDef<RevenueSummaryLine>> =
  [
    { header: "Account code", value: (row) => row.accountCode },
    { header: "Account name", value: (row) => row.accountName },
    { header: "Amount", value: (row) => row.amount },
  ];

export const EXPENSE_SUMMARY_CSV_COLUMNS: Array<CsvColumnDef<ExpenseSummaryLine>> =
  [
    { header: "Account code", value: (row) => row.accountCode },
    { header: "Account name", value: (row) => row.accountName },
    { header: "Amount", value: (row) => row.amount },
  ];

export const RENTAL_REPORT_CSV_COLUMNS: Array<CsvColumnDef<RentalReportLine>> = [
  { header: "Order", value: (row) => row.orderNumber },
  { header: "Customer", value: (row) => row.customerName },
  { header: "Warehouse", value: (row) => row.warehouseName },
  { header: "Status", value: (row) => row.status },
  { header: "Booking date", value: (row) => row.bookingDate },
  { header: "Duration (days)", value: (row) => row.durationDays },
  { header: "Total", value: (row) => row.grandTotal },
];

export const CUSTOMER_REPORT_CSV_COLUMNS: Array<CsvColumnDef<CustomerReportLine>> =
  [
    { header: "Customer code", value: (row) => row.customerCode },
    { header: "Customer name", value: (row) => row.customerName },
    { header: "Orders", value: (row) => row.orderCount },
    { header: "Completed", value: (row) => row.completedOrderCount },
    { header: "Booked total", value: (row) => row.revenue },
    { header: "Open invoice balance", value: (row) => row.outstandingBalance },
    { header: "Last order", value: (row) => row.lastOrderDate ?? "" },
  ];

export function buildBalanceSheetCsvRows(
  data: BalanceSheetResponse,
): Array<{ section: string; accountCode: string; accountName: string; balance: number }> {
  return (
    [
      ["Assets", data.assets],
      ["Liabilities", data.liabilities],
      ["Equity", data.equity],
    ] as const
  ).flatMap(([section, group]) =>
    group.accounts.map((account) => ({
      section,
      accountCode: account.accountCode,
      accountName: account.accountName,
      balance: account.balance,
    })),
  );
}

export const BALANCE_SHEET_CSV_COLUMNS: Array<
  CsvColumnDef<{
    section: string;
    accountCode: string;
    accountName: string;
    balance: number;
  }>
> = [
  { header: "Section", value: (row) => row.section },
  { header: "Account code", value: (row) => row.accountCode },
  { header: "Account name", value: (row) => row.accountName },
  { header: "Balance", value: (row) => row.balance },
];

export function buildCashFlowCsvRows(data: CashFlowResponse) {
  return [
    { metric: "Net income", amount: data.netIncome },
    { metric: "Adjustments", amount: data.adjustments },
    { metric: "Cash from operations", amount: data.cashFromOperations },
    { metric: "Cash receipts", amount: data.cashReceipts },
    { metric: "Cash payments", amount: data.cashPayments },
    { metric: "Net cash change", amount: data.netCashChange },
  ];
}

export const CASH_FLOW_CSV_COLUMNS: Array<
  CsvColumnDef<{ metric: string; amount: number }>
> = [
  { header: "Metric", value: (row) => row.metric },
  { header: "Amount", value: (row) => row.amount },
];

export function buildProfitLossCsvRows(data: ProfitLossResponse) {
  return [
    ...data.revenue.map((line) => ({ type: "Revenue", ...line })),
    ...data.expenses.map((line) => ({ type: "Expense", ...line })),
  ];
}

export const PROFIT_LOSS_CSV_COLUMNS: Array<
  CsvColumnDef<ProfitLossAccountLine & { type: string }>
> = [
  { header: "Type", value: (row) => row.type },
  { header: "Account code", value: (row) => row.accountCode },
  { header: "Account name", value: (row) => row.accountName },
  { header: "Amount", value: (row) => row.amount },
];
