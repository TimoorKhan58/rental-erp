export class SupplierDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierDomainError";
  }
}

export class SupplierInvariantError extends SupplierDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "SupplierInvariantError";
  }
}
