import type { IAssetRepository } from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";

import type { AssetSummaryDto } from "../dtos/asset-summary.dto";
import { toAssetSummaryDto } from "../dtos/asset-summary.dto";
import { toAssetSummaryQuery } from "../mappers/asset-summary.mapper";
import {
  GetAssetSummarySchema,
  type GetAssetSummaryInput,
} from "../schemas/get-asset-summary.schema";

export class GetAssetSummaryService {
  constructor(private readonly assetRepository: IAssetRepository) {}

  async execute(input: GetAssetSummaryInput): Promise<AssetSummaryDto> {
    const query = parseRequest(GetAssetSummarySchema, input);
    const summaryQuery = toAssetSummaryQuery(query);
    const result = await this.assetRepository.findSummaryStats(summaryQuery);

    return toAssetSummaryDto(result);
  }
}
