import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { BrandDto } from "../dtos/brand.dto";
import {
  toBrandDto,
  toBrandListQuery,
} from "../mappers/brand.mapper";
import {
  ListBrandsSchema,
  type ListBrandsInput,
} from "../schemas/list-brands.schema";

export class ListBrandsService {
  constructor(private readonly repository: IBrandRepository) {}

  async execute(
    input: ListBrandsInput,
  ): Promise<PaginatedResult<BrandDto>> {
    const query = parseRequest(ListBrandsSchema, input);
    const result = await this.repository.findPaged(toBrandListQuery(query));

    return {
      items: result.items.map(toBrandDto),
      meta: result.meta,
    };
  }
}
