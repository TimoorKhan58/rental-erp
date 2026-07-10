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
import type { IAssetService } from "./asset-application-services.interface";
import type { AddMaintenanceHistoryService } from "./add-maintenance-history.service";
import type { CreateAssetService } from "./create-asset.service";
import type { DisposeAssetService } from "./dispose-asset.service";
import type { GetAssetByIdService } from "./get-asset-by-id.service";
import type { ListAssetsService } from "./list-assets.service";
import type { TransferAssetService } from "./transfer-asset.service";
import type { UpdateAssetService } from "./update-asset.service";

export class AssetService implements IAssetService {
  constructor(
    private readonly getAssetById: GetAssetByIdService,
    private readonly listAssets: ListAssetsService,
    private readonly createAsset: CreateAssetService,
    private readonly updateAsset: UpdateAssetService,
    private readonly transferAsset: TransferAssetService,
    private readonly disposeAsset: DisposeAssetService,
    private readonly addMaintenanceHistoryService: AddMaintenanceHistoryService,
  ) {}

  getById(params: AssetIdParamInput): Promise<AssetDto> {
    return this.getAssetById.execute(params);
  }

  list(input: ListAssetsInput): Promise<PaginatedResult<AssetDto>> {
    return this.listAssets.execute(input);
  }

  create(input: CreateAssetInput): Promise<AssetDto> {
    return this.createAsset.execute(input);
  }

  update(
    params: AssetIdParamInput,
    input: UpdateAssetInput,
  ): Promise<AssetDto> {
    return this.updateAsset.execute(params, input);
  }

  transfer(
    params: AssetIdParamInput,
    input: TransferAssetInput,
  ): Promise<AssetDto> {
    return this.transferAsset.execute(params, input);
  }

  dispose(
    params: AssetIdParamInput,
    input: DisposeAssetInput,
  ): Promise<AssetDto> {
    return this.disposeAsset.execute(params, input);
  }

  addMaintenanceHistory(
    params: AssetIdParamInput,
    input: AddMaintenanceHistoryInput,
  ): Promise<AssetDto> {
    return this.addMaintenanceHistoryService.execute(params, input);
  }
}
