import type { IAssetRepository } from "@/modules/asset/domain";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { AssetDto } from "../dtos/asset.dto";
import { toAssetListQuery } from "../mappers/asset-list.mapper";
import { toAssetDto } from "../mappers/asset.mapper";
import {
  ListAssetsSchema,
  type ListAssetsInput,
} from "../schemas/list-assets.schema";

export class ListAssetsService {
  constructor(private readonly repository: IAssetRepository) {}

  async execute(input: ListAssetsInput): Promise<PaginatedResult<AssetDto>> {
    const query = parseRequest(ListAssetsSchema, input);
    const result = await this.repository.findPaged(toAssetListQuery(query));

    return {
      items: result.items.map(toAssetDto),
      meta: result.meta,
    };
  }
}
