export class ReturnDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnDomainError";
  }
}

export class ReturnInvariantError extends ReturnDomainError {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ReturnInvariantError";
    this.field = field;
  }
}

export class ReturnInvalidStatusError extends ReturnDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} return in ${currentStatus} status`);
    this.name = "ReturnInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class ReturnInvalidItemError extends ReturnDomainError {
  readonly rentalOrderItemId: string | undefined;

  constructor(message: string, rentalOrderItemId?: string) {
    super(message);
    this.name = "ReturnInvalidItemError";
    this.rentalOrderItemId = rentalOrderItemId;
  }
}

export function createReturnNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ReturnInvariantError("Return number is required", "returnNumber");
  }

  if (trimmed.length > 50) {
    throw new ReturnInvariantError(
      "Return number must not exceed 50 characters",
      "returnNumber",
    );
  }

  return trimmed;
}
