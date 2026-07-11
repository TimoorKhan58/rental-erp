import type {
  AccountingSummaryResponse,
  AccountsSummaryResponse,
  BalanceSheetParams,
  BalanceSheetResponse,
  DateRangeParams,
  GeneralLedgerParams,
  GeneralLedgerResponse,
  ProfitLossResponse,
  TrialBalanceParams,
  TrialBalanceResponse,
} from "../types";
import { apiGet } from "@/lib/api";

const BASE = "/financial-reports";

export async function getTrialBalance(
  params: TrialBalanceParams = {},
): Promise<TrialBalanceResponse> {
  return apiGet<TrialBalanceResponse>(`${BASE}/trial-balance`, { params });
}

export async function getGeneralLedger(
  params: GeneralLedgerParams,
): Promise<GeneralLedgerResponse> {
  return apiGet<GeneralLedgerResponse>(`${BASE}/general-ledger`, { params });
}

export async function getBalanceSheet(
  params: BalanceSheetParams = {},
): Promise<BalanceSheetResponse> {
  return apiGet<BalanceSheetResponse>(`${BASE}/balance-sheet`, { params });
}

export async function getProfitLoss(
  params: DateRangeParams = {},
): Promise<ProfitLossResponse> {
  return apiGet<ProfitLossResponse>(`${BASE}/profit-loss`, { params });
}

export async function getAccountsSummary(): Promise<AccountsSummaryResponse> {
  return apiGet<AccountsSummaryResponse>(`${BASE}/accounts`);
}

export async function getAccountingSummary(
  params: DateRangeParams = {},
): Promise<AccountingSummaryResponse> {
  const [balanceSheet, profitLoss, accountsSummary] = await Promise.all([
    getBalanceSheet(),
    getProfitLoss(params),
    getAccountsSummary(),
  ]);

  return { balanceSheet, profitLoss, accountsSummary };
}
