export {
  handleCreateAsset,
  handleDisposeAsset,
  handleGetAssetById,
  handleListAssets,
  handleTransferAsset,
  handleUpdateAsset,
  handleAddMaintenanceHistory,
} from "./routes/asset-api.routes";
export {
  handleCreateAssetCategory,
  handleDeleteAssetCategory,
  handleGetAssetCategoryById,
  handleListAssetCategories,
  handleUpdateAssetCategory,
} from "./routes/asset-category-api.routes";
export {
  runAssetApiRoute,
  toJsonResponse,
  type AssetApiRouteOptions,
} from "./http/asset-api.route-runner";
export {
  runAssetCategoryApiRoute,
  type AssetCategoryApiRouteOptions,
} from "./http/asset-category-api.route-runner";
export {
  toAssetListResponse,
  toAssetResponse,
  type AssetListResponse,
  type AssetResponse,
} from "./mappers/asset-response.mapper";
export {
  toAssetCategoryListResponse,
  toAssetCategoryResponse,
  type AssetCategoryListResponse,
  type AssetCategoryResponse,
} from "./mappers/asset-category-response.mapper";
export { ASSET_ROUTES, type AssetRouteKey } from "./routes/asset.routes";
export {
  ASSET_CATEGORY_ROUTES,
  type AssetCategoryRouteKey,
} from "./routes/asset-category.routes";
