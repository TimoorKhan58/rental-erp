import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import {
  toAssetCategoryDto,
  toAssetCategoryId,
} from "../mappers/asset-category.mapper";
import {
  AssetCategoryIdParamSchema,
  type AssetCategoryIdParamInput,
} from "../schemas/asset-category.schemas";

export class GetCategoryByIdService {
  constructor(private readonly repository: IAssetCategoryRepository) {}

  async execute(input: AssetCategoryIdParamInput): Promise<AssetCategoryDto> {
    const params = parseRequest(AssetCategoryIdParamSchema, input);
    const category = await this.repository.findById(
      toAssetCategoryId(params.id),
    );

    if (category === null) {
      throw new NotFoundError({
        message: "Asset category not found",
        details: { id: params.id },
      });
    }

    return toAssetCategoryDto(category);
  }
}
