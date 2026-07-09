export class DispatchDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchDomainError";
  }
}

export class DispatchInvariantError extends DispatchDomainError {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "DispatchInvariantError";
    this.field = field;
  }
}

export class DispatchInvalidStatusError extends DispatchDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} dispatch in ${currentStatus} status`);
    this.name = "DispatchInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class DispatchInvalidItemError extends DispatchDomainError {
  readonly productId: string | undefined;

  constructor(message: string, productId?: string) {
    super(message);
    this.name = "DispatchInvalidItemError";
    this.productId = productId;
  }
}

export function createDispatchNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new DispatchInvariantError(
      "Dispatch number is required",
      "dispatchNumber",
    );
  }

  if (trimmed.length > 50) {
    throw new DispatchInvariantError(
      "Dispatch number must not exceed 50 characters",
      "dispatchNumber",
    );
  }

  return trimmed;
}
