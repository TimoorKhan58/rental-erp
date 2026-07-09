import type { AccountType } from "@/modules/accounting/domain/account.constants";
import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "@/modules/accounting/domain/journal-entry.constants";

export interface TrialBalanceLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
}

export interface TrialBalanceDto {
  dateFrom: string | null;
  dateTo: string | null;
  lines: TrialBalanceLineDto[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface BalanceSheetAccountLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheetSectionDto {
  accounts: BalanceSheetAccountLineDto[];
  total: number;
}

export interface BalanceSheetDto {
  asOfDate: string | null;
  assets: BalanceSheetSectionDto;
  liabilities: BalanceSheetSectionDto;
  equity: BalanceSheetSectionDto;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  isBalanced: boolean;
}

export interface ProfitLossAccountLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitLossDto {
  dateFrom: string | null;
  dateTo: string | null;
  revenue: ProfitLossAccountLineDto[];
  expenses: ProfitLossAccountLineDto[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface LedgerEntryLineDto {
  journalEntryId: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  memo: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountLedgerDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  dateFrom: string | null;
  dateTo: string | null;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntryLineDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type GeneralLedgerDto = AccountLedgerDto;

export interface JournalReportLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface JournalReportItemDto {
  id: string;
  journalNumber: string;
  journalDate: string;
  status: JournalEntryStatus;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  lines: JournalReportLineDto[];
  debitTotal: number;
  creditTotal: number;
}

export interface JournalReportDto {
  dateFrom: string | null;
  dateTo: string | null;
  items: JournalReportItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CashFlowSummaryDto {
  dateFrom: string | null;
  dateTo: string | null;
  netIncome: number;
  adjustments: number;
  cashFromOperations: number;
  cashReceipts: number;
  cashPayments: number;
  netCashChange: number;
}

export interface RevenueSummaryLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface RevenueSummaryDto {
  dateFrom: string | null;
  dateTo: string | null;
  lines: RevenueSummaryLineDto[];
  totalRevenue: number;
}

export interface ExpenseSummaryLineDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ExpenseSummaryDto {
  dateFrom: string | null;
  dateTo: string | null;
  lines: ExpenseSummaryLineDto[];
  totalExpenses: number;
}

export interface AccountsByTypeCountDto {
  accountType: AccountType;
  count: number;
}

export interface AccountsSummaryDto {
  activeAccounts: number;
  inactiveAccounts: number;
  totalAccounts: number;
  accountsByType: AccountsByTypeCountDto[];
}
