export class AssetDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetDomainError";
  }
}

export class AssetInvariantError extends AssetDomainError {
  readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = "AssetInvariantError";
    this.field = field;
  }
}

export class AssetInvalidStatusError extends AssetDomainError {
  readonly currentStatus: string;
  readonly action: string;

  constructor(currentStatus: string, action: string) {
    super(`Cannot ${action} asset in ${currentStatus} status`);
    this.name = "AssetInvalidStatusError";
    this.currentStatus = currentStatus;
    this.action = action;
  }
}
