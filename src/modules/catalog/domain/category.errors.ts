export class CategoryInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "CategoryInvariantError";
  }
}
