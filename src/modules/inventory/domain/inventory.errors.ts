export class InventoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryDomainError";
  }
}

export class InventoryInvariantError extends InventoryDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "InventoryInvariantError";
  }
}
