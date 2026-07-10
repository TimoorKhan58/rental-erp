export class NumberSequenceDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NumberSequenceDomainError";
  }
}

export class NumberSequenceInvariantError extends NumberSequenceDomainError {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "NumberSequenceInvariantError";
  }
}

export class NumberSequenceNotFoundError extends NumberSequenceDomainError {
  constructor(id?: string) {
    super(
      id ? `Number sequence not found: ${id}` : "Number sequence not found",
    );
    this.name = "NumberSequenceNotFoundError";
  }
}
