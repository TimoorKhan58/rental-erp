export class WarehouseDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarehouseDomainError";
  }
}

export class WarehouseInvariantError extends WarehouseDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "WarehouseInvariantError";
  }
}
