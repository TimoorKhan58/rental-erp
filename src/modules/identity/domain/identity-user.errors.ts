export class IdentityUserInvariantError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "IdentityUserInvariantError";
    this.field = field;
  }
}

export class IdentityUserNotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "IdentityUserNotFoundError";
  }
}

export class IdentityUserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityUserConflictError";
  }
}

export class IdentityUserStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityUserStateError";
  }
}
