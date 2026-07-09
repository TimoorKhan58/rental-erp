import type {
  AccountLedgerDto,
  AccountsSummaryDto,
  BalanceSheetDto,
  CashFlowSummaryDto,
  ExpenseSummaryDto,
  GeneralLedgerDto,
  JournalReportDto,
  ProfitLossDto,
  RevenueSummaryDto,
  TrialBalanceDto,
} from "../dtos/financial-report.dto";
import type {
  AccountLedgerQueryInput,
  AccountsSummaryQueryInput,
  BalanceSheetQueryInput,
  CashFlowSummaryQueryInput,
  ExpenseSummaryQueryInput,
  GeneralLedgerQueryInput,
  JournalReportQueryInput,
  ProfitLossQueryInput,
  RevenueSummaryQueryInput,
  TrialBalanceQueryInput,
} from "../schemas/financial-report.schemas";
import type { GetAccountLedgerService } from "./get-account-ledger.service";
import type { GetAccountsSummaryService } from "./get-accounts-summary.service";
import type { GetBalanceSheetService } from "./get-balance-sheet.service";
import type { GetCashFlowSummaryService } from "./get-cash-flow-summary.service";
import type { GetExpenseSummaryService } from "./get-expense-summary.service";
import type { GetGeneralLedgerService } from "./get-general-ledger.service";
import type { GetJournalReportService } from "./get-journal-report.service";
import type { GetProfitLossService } from "./get-profit-loss.service";
import type { GetRevenueSummaryService } from "./get-revenue-summary.service";
import type { GetTrialBalanceService } from "./get-trial-balance.service";

export interface FinancialReportApplicationServices {
  getTrialBalance: GetTrialBalanceService;
  getBalanceSheet: GetBalanceSheetService;
  getProfitLoss: GetProfitLossService;
  getGeneralLedger: GetGeneralLedgerService;
  getAccountLedger: GetAccountLedgerService;
  getJournalReport: GetJournalReportService;
  getCashFlowSummary: GetCashFlowSummaryService;
  getRevenueSummary: GetRevenueSummaryService;
  getExpenseSummary: GetExpenseSummaryService;
  getAccountsSummary: GetAccountsSummaryService;
}

export type FinancialReportServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => FinancialReportApplicationServices;

export interface IFinancialReportService {
  getTrialBalance(input: TrialBalanceQueryInput): Promise<TrialBalanceDto>;
  getBalanceSheet(input: BalanceSheetQueryInput): Promise<BalanceSheetDto>;
  getProfitLoss(input: ProfitLossQueryInput): Promise<ProfitLossDto>;
  getGeneralLedger(input: GeneralLedgerQueryInput): Promise<GeneralLedgerDto>;
  getAccountLedger(input: AccountLedgerQueryInput): Promise<AccountLedgerDto>;
  getJournalReport(input: JournalReportQueryInput): Promise<JournalReportDto>;
  getCashFlowSummary(
    input: CashFlowSummaryQueryInput,
  ): Promise<CashFlowSummaryDto>;
  getRevenueSummary(input: RevenueSummaryQueryInput): Promise<RevenueSummaryDto>;
  getExpenseSummary(input: ExpenseSummaryQueryInput): Promise<ExpenseSummaryDto>;
  getAccountsSummary(
    input?: AccountsSummaryQueryInput,
  ): Promise<AccountsSummaryDto>;
}
