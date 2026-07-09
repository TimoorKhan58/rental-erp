export class ReportingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingDomainError";
  }
}

export class InvalidReportDateRangeError extends ReportingDomainError {
  constructor() {
    super("dateFrom must be on or before dateTo");
  }
}
