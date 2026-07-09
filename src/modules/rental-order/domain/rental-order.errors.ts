export class RentalOrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RentalOrderDomainError";
  }
}

export class RentalOrderInvariantError extends RentalOrderDomainError {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "RentalOrderInvariantError";
    this.field = field;
  }
}

export class RentalOrderInvalidStatusError extends RentalOrderDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} rental order in ${currentStatus} status`);
    this.name = "RentalOrderInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class RentalOrderInvalidReserveError extends RentalOrderDomainError {
  readonly productId: string | undefined;

  constructor(message: string, productId?: string) {
    super(message);
    this.name = "RentalOrderInvalidReserveError";
    this.productId = productId;
  }
}

export function createOrderNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new RentalOrderInvariantError("Order number is required", "orderNumber");
  }

  if (trimmed.length > 50) {
    throw new RentalOrderInvariantError(
      "Order number must not exceed 50 characters",
      "orderNumber",
    );
  }

  return trimmed;
}
