export class UnitInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "UnitInvariantError";
  }
}
