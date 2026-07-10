export { Asset } from "./asset.entity";
export {
  AssetCategory,
  toUpdatedAssetCategoryProps,
} from "./asset-category.entity";
export {
  AssetDomainError,
  AssetInvariantError,
  AssetInvalidStatusError,
} from "./asset.errors";
export {
  AssetCategoryDomainError,
  AssetCategoryInvariantError,
} from "./asset-category.errors";
export {
  ASSET_ENTITY_NAME,
  ASSET_MODULE,
  ASSET_SEARCH_FIELDS,
  ASSET_SORT_FIELDS,
  ASSET_STATUSES,
  DEFAULT_ASSET_CATEGORIES,
  type AssetSortField,
  type AssetStatus,
} from "./asset.constants";
export {
  ASSET_CATEGORY_ENTITY_NAME,
  ASSET_CATEGORY_MODULE,
  ASSET_CATEGORY_SEARCH_FIELDS,
  ASSET_CATEGORY_SORT_FIELDS,
  type AssetCategorySortField,
} from "./asset-category.constants";
export {
  calculateAccumulatedDepreciation,
  calculateBookValue,
  calculateMonthlyDepreciation,
  generateDepreciationSchedule,
  type DepreciationScheduleEntry,
} from "./asset.depreciation";
export type { AssetListQuery } from "./asset-list.query";
export type { AssetCategoryListQuery } from "./asset-category-list.query";
export type { IAssetRepository } from "./asset.repository.interface";
export type { IAssetCategoryRepository } from "./asset-category.repository.interface";
export type {
  AddMaintenanceHistoryData,
  AssetMaintenanceHistoryRecord,
  AssetProps,
  AssetTransferRecord,
  CreateAssetData,
  CreateAssetTransferData,
  DisposeAssetData,
  TransferAssetData,
  UpdateAssetData,
} from "./asset.types";
export type {
  AssetCategoryProps,
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "./asset-category.types";
export {
  assertCanAddMaintenance,
  assertCanDispose,
  assertCanTransfer,
  assertCanUpdate,
  assertValidStatusTransition,
} from "./asset.rules";
export {
  createAssetCode,
  type AssetCode,
} from "./value-objects/asset-code.vo";
