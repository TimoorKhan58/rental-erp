export class AttributeInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "AttributeInvariantError";
  }
}
