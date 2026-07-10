import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { CategoryDto } from "../dtos/category.dto";
import {
  toCategoryDto,
  toCategoryId,
} from "../mappers/category.mapper";
import {
  CategoryIdParamSchema,
  type CategoryIdParamInput,
} from "../schemas/category.schemas";

export class GetCategoryByIdService {
  constructor(private readonly repository: ICategoryRepository) {}

  async execute(input: CategoryIdParamInput): Promise<CategoryDto> {
    const params = parseRequest(CategoryIdParamSchema, input);
    const entity = await this.repository.findById(toCategoryId(params.id));

    if (entity === null) {
      throw new NotFoundError({
        message: "Category not found",
        details: { id: params.id },
      });
    }

    return toCategoryDto(entity);
  }
}
