import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { AssetCategoryDto } from "../dtos/asset-category.dto";
import { toAssetCategoryListQuery } from "../mappers/asset-category-list.mapper";
import { toAssetCategoryDto } from "../mappers/asset-category.mapper";
import {
  ListAssetCategoriesSchema,
  type ListAssetCategoriesInput,
} from "../schemas/list-asset-categories.schema";

export class ListCategoriesService {
  constructor(private readonly repository: IAssetCategoryRepository) {}

  async execute(
    input: ListAssetCategoriesInput,
  ): Promise<PaginatedResult<AssetCategoryDto>> {
    const query = parseRequest(ListAssetCategoriesSchema, input);
    const result = await this.repository.findPaged(
      toAssetCategoryListQuery(query),
    );

    return {
      items: result.items.map(toAssetCategoryDto),
      meta: result.meta,
    };
  }
}
