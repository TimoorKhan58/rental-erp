import type { IAssetRepository } from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { AssetDto } from "../dtos/asset.dto";
import {
  toAssetDetailDto,
  toAssetId,
} from "../mappers/asset.mapper";
import {
  AssetIdParamSchema,
  type AssetIdParamInput,
} from "../schemas/asset.schemas";

export class GetAssetByIdService {
  constructor(private readonly repository: IAssetRepository) {}

  async execute(input: AssetIdParamInput): Promise<AssetDto> {
    const params = parseRequest(AssetIdParamSchema, input);
    const assetId = toAssetId(params.id);
    const asset = await this.repository.findById(assetId);

    if (asset === null) {
      throw new NotFoundError({
        message: "Asset not found",
        details: { id: params.id },
      });
    }

    const [transfers, maintenanceHistory] = await Promise.all([
      this.repository.findTransfersByAssetId(assetId),
      this.repository.findMaintenanceHistoryByAssetId(assetId),
    ]);

    return toAssetDetailDto(asset, transfers, maintenanceHistory);
  }
}
