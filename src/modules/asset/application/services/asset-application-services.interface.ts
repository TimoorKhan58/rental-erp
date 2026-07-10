import type { PaginatedResult } from "@/shared/domain/pagination";

import type { AssetDto } from "../dtos/asset.dto";
import type {
  AddMaintenanceHistoryInput,
  AssetIdParamInput,
  CreateAssetInput,
  DisposeAssetInput,
  TransferAssetInput,
  UpdateAssetInput,
} from "../schemas/asset.schemas";
import type { ListAssetsInput } from "../schemas/list-assets.schema";
import type { AddMaintenanceHistoryService } from "./add-maintenance-history.service";
import type { CreateAssetService } from "./create-asset.service";
import type { DisposeAssetService } from "./dispose-asset.service";
import type { GetAssetByIdService } from "./get-asset-by-id.service";
import type { ListAssetsService } from "./list-assets.service";
import type { TransferAssetService } from "./transfer-asset.service";
import type { UpdateAssetService } from "./update-asset.service";

export interface AssetApplicationServices {
  getAssetById: GetAssetByIdService;
  listAssets: ListAssetsService;
  createAsset: CreateAssetService;
  updateAsset: UpdateAssetService;
  transferAsset: TransferAssetService;
  disposeAsset: DisposeAssetService;
  addMaintenanceHistory: AddMaintenanceHistoryService;
}

export interface IAssetService {
  getById(params: AssetIdParamInput): Promise<AssetDto>;
  list(input: ListAssetsInput): Promise<PaginatedResult<AssetDto>>;
  create(input: CreateAssetInput): Promise<AssetDto>;
  update(
    params: AssetIdParamInput,
    input: UpdateAssetInput,
  ): Promise<AssetDto>;
  transfer(
    params: AssetIdParamInput,
    input: TransferAssetInput,
  ): Promise<AssetDto>;
  dispose(
    params: AssetIdParamInput,
    input: DisposeAssetInput,
  ): Promise<AssetDto>;
  addMaintenanceHistory(
    params: AssetIdParamInput,
    input: AddMaintenanceHistoryInput,
  ): Promise<AssetDto>;
}

export type AssetServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => AssetApplicationServices;
