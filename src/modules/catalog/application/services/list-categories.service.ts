import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { CategoryDto } from "../dtos/category.dto";
import {
  toCategoryDto,
  toCategoryListQuery,
} from "../mappers/category.mapper";
import {
  ListCategoriesSchema,
  type ListCategoriesInput,
} from "../schemas/list-categories.schema";

export class ListCategoriesService {
  constructor(private readonly repository: ICategoryRepository) {}

  async execute(
    input: ListCategoriesInput,
  ): Promise<PaginatedResult<CategoryDto>> {
    const query = parseRequest(ListCategoriesSchema, input);
    const result = await this.repository.findPaged(toCategoryListQuery(query));

    return {
      items: result.items.map(toCategoryDto),
      meta: result.meta,
    };
  }
}
