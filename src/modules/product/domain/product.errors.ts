export class ProductDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductDomainError";
  }
}

export class ProductInvariantError extends ProductDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "ProductInvariantError";
  }
}
