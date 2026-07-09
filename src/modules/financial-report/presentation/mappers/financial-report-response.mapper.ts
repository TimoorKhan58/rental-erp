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
} from "@/modules/financial-report/application/dtos/financial-report.dto";

export function toTrialBalanceResponse(dto: TrialBalanceDto): TrialBalanceDto {
  return dto;
}

export function toBalanceSheetResponse(dto: BalanceSheetDto): BalanceSheetDto {
  return dto;
}

export function toProfitLossResponse(dto: ProfitLossDto): ProfitLossDto {
  return dto;
}

export function toGeneralLedgerResponse(
  dto: GeneralLedgerDto,
): GeneralLedgerDto {
  return dto;
}

export function toAccountLedgerResponse(
  dto: AccountLedgerDto,
): AccountLedgerDto {
  return dto;
}

export function toJournalReportResponse(
  dto: JournalReportDto,
): JournalReportDto {
  return dto;
}

export function toCashFlowSummaryResponse(
  dto: CashFlowSummaryDto,
): CashFlowSummaryDto {
  return dto;
}

export function toRevenueSummaryResponse(
  dto: RevenueSummaryDto,
): RevenueSummaryDto {
  return dto;
}

export function toExpenseSummaryResponse(
  dto: ExpenseSummaryDto,
): ExpenseSummaryDto {
  return dto;
}

export function toAccountsSummaryResponse(
  dto: AccountsSummaryDto,
): AccountsSummaryDto {
  return dto;
}
