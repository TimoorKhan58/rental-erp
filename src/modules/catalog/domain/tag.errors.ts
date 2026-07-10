export class TagInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "TagInvariantError";
  }
}
