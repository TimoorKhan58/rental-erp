export class ExpenseCategoryInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ExpenseCategoryInvariantError";
  }
}
