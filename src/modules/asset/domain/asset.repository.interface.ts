import type { AssetId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Asset } from "./asset.entity";
import type { AssetListQuery } from "./asset-list.query";
import type {
  AddMaintenanceHistoryData,
  AssetMaintenanceHistoryRecord,
  AssetTransferRecord,
  CreateAssetData,
  CreateAssetTransferData,
  DisposeAssetData,
  TransferAssetData,
  UpdateAssetData,
} from "./asset.types";

export interface IAssetRepository {
  findById(id: AssetId): Promise<Asset | null>;
  findByAssetCode(assetCode: string): Promise<Asset | null>;
  findPaged(query: AssetListQuery): Promise<PaginatedResult<Asset>>;
  create(data: CreateAssetData): Promise<Asset>;
  update(id: AssetId, data: UpdateAssetData): Promise<Asset>;
  updateAfterTransfer(
    id: AssetId,
    data: TransferAssetData,
  ): Promise<Asset>;
  updateAfterDispose(id: AssetId, data: DisposeAssetData): Promise<Asset>;
  updateAfterMaintenance(
    id: AssetId,
    data: AddMaintenanceHistoryData,
  ): Promise<Asset>;
  createTransfer(data: CreateAssetTransferData): Promise<AssetTransferRecord>;
  createMaintenanceHistory(
    assetId: AssetId,
    data: AddMaintenanceHistoryData,
  ): Promise<AssetMaintenanceHistoryRecord>;
  findTransfersByAssetId(assetId: AssetId): Promise<AssetTransferRecord[]>;
  findMaintenanceHistoryByAssetId(
    assetId: AssetId,
  ): Promise<AssetMaintenanceHistoryRecord[]>;
}
