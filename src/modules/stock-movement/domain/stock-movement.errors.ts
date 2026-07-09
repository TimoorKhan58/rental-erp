export class StockMovementDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockMovementDomainError";
  }
}

export class StockMovementInvariantError extends StockMovementDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "StockMovementInvariantError";
  }
}

export class StockMovementInsufficientQuantityError extends StockMovementDomainError {
  constructor(
    message: string,
    readonly movementType: string,
    readonly requestedQuantity: number,
    readonly availableQuantity: number,
  ) {
    super(message);
    this.name = "StockMovementInsufficientQuantityError";
  }
}
