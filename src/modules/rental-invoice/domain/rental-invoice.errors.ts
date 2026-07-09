import type { RentalInvoiceStatus } from "./rental-invoice.constants";

export class RentalInvoiceInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "RentalInvoiceInvariantError";
  }
}

export class RentalInvoiceInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: RentalInvoiceStatus,
    readonly action: string,
  ) {
    super(
      `Cannot ${action} rental invoice in ${currentStatus} status`,
    );
    this.name = "RentalInvoiceInvalidStatusError";
  }
}

export class RentalInvoiceEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RentalInvoiceEligibilityError";
  }
}

export function createInvoiceNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new RentalInvoiceInvariantError(
      "Invoice number is required",
      "invoiceNumber",
    );
  }

  return trimmed;
}
