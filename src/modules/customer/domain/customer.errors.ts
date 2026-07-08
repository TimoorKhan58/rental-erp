export class CustomerDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerDomainError";
  }
}

export class CustomerInvariantError extends CustomerDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "CustomerInvariantError";
  }
}
