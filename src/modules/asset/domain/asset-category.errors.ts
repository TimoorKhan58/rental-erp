export class AssetCategoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetCategoryDomainError";
  }
}

export class AssetCategoryInvariantError extends AssetCategoryDomainError {
  constructor(message: string, readonly field?: string) {
    super(message);
    this.name = "AssetCategoryInvariantError";
  }
}
