import type { AccountType } from "@/modules/accounting/domain/account.constants";

import {
  CREDIT_NORMAL_ACCOUNT_TYPES,
  DEBIT_NORMAL_ACCOUNT_TYPES,
} from "./financial-report.constants";
import type {
  BalanceSheetReport,
  TrialBalanceLine,
  TrialBalanceReport,
} from "./financial-report.types";

const ROUNDING_TOLERANCE = 0.005;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isDebitNormalAccount(accountType: AccountType): boolean {
  return (DEBIT_NORMAL_ACCOUNT_TYPES as readonly AccountType[]).includes(
    accountType,
  );
}

export function isCreditNormalAccount(accountType: AccountType): boolean {
  return (CREDIT_NORMAL_ACCOUNT_TYPES as readonly AccountType[]).includes(
    accountType,
  );
}

/**
 * Signed ending balance from the account's normal balance perspective.
 * Debit-normal: debit - credit. Credit-normal: credit - debit.
 */
export function calculateEndingBalance(
  accountType: AccountType,
  totalDebit: number,
  totalCredit: number,
): number {
  const debit = roundMoney(totalDebit);
  const credit = roundMoney(totalCredit);

  if (isDebitNormalAccount(accountType)) {
    return roundMoney(debit - credit);
  }

  return roundMoney(credit - debit);
}

/**
 * Raw debit-credit net used for running balances on ledgers.
 */
export function calculateDebitCreditNet(
  totalDebit: number,
  totalCredit: number,
): number {
  return roundMoney(totalDebit - totalCredit);
}

export function amountsEqual(left: number, right: number): boolean {
  return Math.abs(roundMoney(left) - roundMoney(right)) < ROUNDING_TOLERANCE;
}

export function buildTrialBalanceLines(
  aggregates: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    totalDebit: number;
    totalCredit: number;
  }>,
): TrialBalanceLine[] {
  return aggregates
    .map((row) => ({
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
      totalDebit: roundMoney(row.totalDebit),
      totalCredit: roundMoney(row.totalCredit),
      endingBalance: calculateEndingBalance(
        row.accountType,
        row.totalDebit,
        row.totalCredit,
      ),
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export function buildTrialBalanceReport(
  lines: TrialBalanceLine[],
  dateFrom: Date | null,
  dateTo: Date | null,
): TrialBalanceReport {
  const totalDebit = roundMoney(
    lines.reduce((sum, line) => sum + line.totalDebit, 0),
  );
  const totalCredit = roundMoney(
    lines.reduce((sum, line) => sum + line.totalCredit, 0),
  );

  return {
    dateFrom,
    dateTo,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: amountsEqual(totalDebit, totalCredit),
  };
}

export function isBalanceSheetBalanced(report: {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}): boolean {
  return amountsEqual(
    report.totalAssets,
    roundMoney(report.totalLiabilities + report.totalEquity),
  );
}

export function assertTrialBalanceBalanced(report: TrialBalanceReport): void {
  if (!report.isBalanced) {
    // Reporting remains read-only and still returns the report; callers may
    // inspect `isBalanced`. This helper exists for domain/unit tests.
  }
}

export function withBalanceSheetEquation(
  report: Omit<BalanceSheetReport, "isBalanced">,
): BalanceSheetReport {
  return {
    ...report,
    isBalanced: isBalanceSheetBalanced(report),
  };
}
