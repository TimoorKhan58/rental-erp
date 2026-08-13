import type { ExternalRentalAgreementStatus } from "./external-rental.constants";

export class ExternalRentalInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvariantError";
  }
}

export class ExternalRentalInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: ExternalRentalAgreementStatus,
    readonly action: string,
  ) {
    super(
      `Cannot ${action} external rental agreement in ${currentStatus} status`,
    );
    this.name = "ExternalRentalInvalidStatusError";
  }
}

export class ExternalRentalInvalidReceiveError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidReceiveError";
  }
}

export class ExternalRentalInvalidAllocateError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidAllocateError";
  }
}

export class ExternalRentalInvalidDispatchError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidDispatchError";
  }
}

export class ExternalRentalInvalidCustomerReturnError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidCustomerReturnError";
  }
}

export class ExternalRentalInvalidSupplierReturnError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidSupplierReturnError";
  }
}

export class ExternalRentalInvalidWriteOffError extends Error {
  constructor(
    message: string,
    readonly rentalOrderItemId?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidWriteOffError";
  }
}

export class ExternalRentalInvalidSettlementError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ExternalRentalInvalidSettlementError";
  }
}

export function createExternalRentalAgreementNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ExternalRentalInvariantError(
      "Agreement number is required",
      "agreementNumber",
    );
  }

  return trimmed;
}
