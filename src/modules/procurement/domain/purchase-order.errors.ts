export class PurchaseOrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseOrderDomainError";
  }
}

export class PurchaseOrderInvariantError extends PurchaseOrderDomainError {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "PurchaseOrderInvariantError";
    this.field = field;
  }
}

export class PurchaseOrderInvalidStatusError extends PurchaseOrderDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} purchase order in ${currentStatus} status`);
    this.name = "PurchaseOrderInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}

export class PurchaseOrderInvalidReceiveError extends PurchaseOrderDomainError {
  readonly productId: string | undefined;

  constructor(message: string, productId?: string) {
    super(message);
    this.name = "PurchaseOrderInvalidReceiveError";
    this.productId = productId;
  }
}

export function createPoNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new PurchaseOrderInvariantError("PO number is required", "poNumber");
  }

  if (trimmed.length > 50) {
    throw new PurchaseOrderInvariantError(
      "PO number must not exceed 50 characters",
      "poNumber",
    );
  }

  return trimmed;
}
