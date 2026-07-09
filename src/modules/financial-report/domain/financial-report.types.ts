import type { AccountType } from "@/modules/accounting/domain/account.constants";
import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "@/modules/accounting/domain/journal-entry.constants";

export interface DateRangeFilter {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
}

export interface TrialBalanceReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface BalanceSheetAccountLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheetSection {
  accounts: BalanceSheetAccountLine[];
  total: number;
}

export interface BalanceSheetReport {
  asOfDate: Date | null;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netIncome: number;
  isBalanced: boolean;
}

export interface ProfitLossAccountLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitLossReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  revenue: ProfitLossAccountLine[];
  expenses: ProfitLossAccountLine[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface LedgerEntryLine {
  journalEntryId: string;
  journalNumber: string;
  journalDate: Date;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  memo: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountLedgerReport {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  dateFrom: Date | null;
  dateTo: Date | null;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntryLine[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type GeneralLedgerReport = AccountLedgerReport;

export interface JournalReportLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface JournalReportItem {
  id: string;
  journalNumber: string;
  journalDate: Date;
  status: JournalEntryStatus;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  lines: JournalReportLine[];
  debitTotal: number;
  creditTotal: number;
}

export interface JournalReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  items: JournalReportItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CashFlowSummaryReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  netIncome: number;
  adjustments: number;
  cashFromOperations: number;
  cashReceipts: number;
  cashPayments: number;
  netCashChange: number;
}

export interface RevenueSummaryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface RevenueSummaryReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  lines: RevenueSummaryLine[];
  totalRevenue: number;
}

export interface ExpenseSummaryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ExpenseSummaryReport {
  dateFrom: Date | null;
  dateTo: Date | null;
  lines: ExpenseSummaryLine[];
  totalExpenses: number;
}

export interface AccountsByTypeCount {
  accountType: AccountType;
  count: number;
}

export interface AccountsSummaryReport {
  activeAccounts: number;
  inactiveAccounts: number;
  totalAccounts: number;
  accountsByType: AccountsByTypeCount[];
}

export interface AccountBalanceAggregate {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  isActive: boolean;
  totalDebit: number;
  totalCredit: number;
}
