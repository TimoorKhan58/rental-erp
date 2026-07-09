import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { ProductDto } from "../dtos/product.dto";
import { toProductListQuery } from "../mappers/product-list.mapper";
import { toProductDto } from "../mappers/product.mapper";
import {
  ListProductsSchema,
  type ListProductsInput,
} from "../schemas/list-products.schema";

export class ListProductsService {
  constructor(private readonly repository: IProductRepository) {}

  async execute(
    input: ListProductsInput,
  ): Promise<PaginatedResult<ProductDto>> {
    const query = parseRequest(ListProductsSchema, input);
    const result = await this.repository.findPaged(toProductListQuery(query));

    return {
      items: result.items.map(toProductDto),
      meta: result.meta,
    };
  }
}
