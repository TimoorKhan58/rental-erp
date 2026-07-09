import type { FinancialReportApplicationServices as FinancialReportApplicationServicesBase } from "@/modules/financial-report/application/services/financial-report-application-services.interface";
import { FinancialReportService } from "@/modules/financial-report/application/services/financial-report.service";
import type { IFinancialReportService } from "@/modules/financial-report/application/services/financial-report-application-services.interface";
import { GetAccountLedgerService } from "@/modules/financial-report/application/services/get-account-ledger.service";
import { GetAccountsSummaryService } from "@/modules/financial-report/application/services/get-accounts-summary.service";
import { GetBalanceSheetService } from "@/modules/financial-report/application/services/get-balance-sheet.service";
import { GetCashFlowSummaryService } from "@/modules/financial-report/application/services/get-cash-flow-summary.service";
import { GetExpenseSummaryService } from "@/modules/financial-report/application/services/get-expense-summary.service";
import { GetGeneralLedgerService } from "@/modules/financial-report/application/services/get-general-ledger.service";
import { GetJournalReportService } from "@/modules/financial-report/application/services/get-journal-report.service";
import { GetProfitLossService } from "@/modules/financial-report/application/services/get-profit-loss.service";
import { GetRevenueSummaryService } from "@/modules/financial-report/application/services/get-revenue-summary.service";
import { GetTrialBalanceService } from "@/modules/financial-report/application/services/get-trial-balance.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createFinancialReportRepositoryFromSharedDeps } from "./create-financial-report.repository";

export type { FinancialReportApplicationServicesBase as FinancialReportApplicationServices };

export interface WiredFinancialReportApplicationServices
  extends FinancialReportApplicationServicesBase {
  financialReportService: IFinancialReportService;
}

export function createFinancialReportApplicationServices(
  deps: SharedDeps,
): WiredFinancialReportApplicationServices {
  const financialReportRepository =
    createFinancialReportRepositoryFromSharedDeps(deps);

  const getTrialBalance = new GetTrialBalanceService(financialReportRepository);
  const getBalanceSheet = new GetBalanceSheetService(financialReportRepository);
  const getProfitLoss = new GetProfitLossService(financialReportRepository);
  const getGeneralLedger = new GetGeneralLedgerService(
    financialReportRepository,
  );
  const getAccountLedger = new GetAccountLedgerService(
    financialReportRepository,
  );
  const getJournalReport = new GetJournalReportService(
    financialReportRepository,
  );
  const getCashFlowSummary = new GetCashFlowSummaryService(
    financialReportRepository,
  );
  const getRevenueSummary = new GetRevenueSummaryService(
    financialReportRepository,
  );
  const getExpenseSummary = new GetExpenseSummaryService(
    financialReportRepository,
  );
  const getAccountsSummary = new GetAccountsSummaryService(
    financialReportRepository,
  );

  return {
    getTrialBalance,
    getBalanceSheet,
    getProfitLoss,
    getGeneralLedger,
    getAccountLedger,
    getJournalReport,
    getCashFlowSummary,
    getRevenueSummary,
    getExpenseSummary,
    getAccountsSummary,
    financialReportService: new FinancialReportService(
      getTrialBalance,
      getBalanceSheet,
      getProfitLoss,
      getGeneralLedger,
      getAccountLedger,
      getJournalReport,
      getCashFlowSummary,
      getRevenueSummary,
      getExpenseSummary,
      getAccountsSummary,
    ),
  };
}
