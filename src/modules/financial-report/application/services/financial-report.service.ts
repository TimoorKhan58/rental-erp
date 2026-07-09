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
import type { IFinancialReportService } from "./financial-report-application-services.interface";
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

export class FinancialReportService implements IFinancialReportService {
  constructor(
    private readonly getTrialBalanceService: GetTrialBalanceService,
    private readonly getBalanceSheetService: GetBalanceSheetService,
    private readonly getProfitLossService: GetProfitLossService,
    private readonly getGeneralLedgerService: GetGeneralLedgerService,
    private readonly getAccountLedgerService: GetAccountLedgerService,
    private readonly getJournalReportService: GetJournalReportService,
    private readonly getCashFlowSummaryService: GetCashFlowSummaryService,
    private readonly getRevenueSummaryService: GetRevenueSummaryService,
    private readonly getExpenseSummaryService: GetExpenseSummaryService,
    private readonly getAccountsSummaryService: GetAccountsSummaryService,
  ) {}

  getTrialBalance(input: TrialBalanceQueryInput): Promise<TrialBalanceDto> {
    return this.getTrialBalanceService.execute(input);
  }

  getBalanceSheet(input: BalanceSheetQueryInput): Promise<BalanceSheetDto> {
    return this.getBalanceSheetService.execute(input);
  }

  getProfitLoss(input: ProfitLossQueryInput): Promise<ProfitLossDto> {
    return this.getProfitLossService.execute(input);
  }

  getGeneralLedger(input: GeneralLedgerQueryInput): Promise<GeneralLedgerDto> {
    return this.getGeneralLedgerService.execute(input);
  }

  getAccountLedger(input: AccountLedgerQueryInput): Promise<AccountLedgerDto> {
    return this.getAccountLedgerService.execute(input);
  }

  getJournalReport(input: JournalReportQueryInput): Promise<JournalReportDto> {
    return this.getJournalReportService.execute(input);
  }

  getCashFlowSummary(
    input: CashFlowSummaryQueryInput,
  ): Promise<CashFlowSummaryDto> {
    return this.getCashFlowSummaryService.execute(input);
  }

  getRevenueSummary(
    input: RevenueSummaryQueryInput,
  ): Promise<RevenueSummaryDto> {
    return this.getRevenueSummaryService.execute(input);
  }

  getExpenseSummary(
    input: ExpenseSummaryQueryInput,
  ): Promise<ExpenseSummaryDto> {
    return this.getExpenseSummaryService.execute(input);
  }

  getAccountsSummary(
    input: AccountsSummaryQueryInput = {},
  ): Promise<AccountsSummaryDto> {
    return this.getAccountsSummaryService.execute(input);
  }
}
