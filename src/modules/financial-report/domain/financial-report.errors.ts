export class FinancialReportDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialReportDomainError";
  }
}

export class UnbalancedTrialBalanceError extends FinancialReportDomainError {
  constructor() {
    super("Trial balance does not balance: total debits must equal total credits");
  }
}

export class UnbalancedBalanceSheetError extends FinancialReportDomainError {
  constructor() {
    super(
      "Balance sheet equation failed: assets must equal liabilities plus equity",
    );
  }
}
