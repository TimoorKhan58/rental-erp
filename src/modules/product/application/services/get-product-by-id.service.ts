import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { ProductDto } from "../dtos/product.dto";
import { toProductDto, toProductId } from "../mappers/product.mapper";
import {
  ProductIdParamSchema,
  type ProductIdParamInput,
} from "../schemas/product.schemas";

export class GetProductByIdService {
  constructor(private readonly repository: IProductRepository) {}

  async execute(input: ProductIdParamInput): Promise<ProductDto> {
    const params = parseRequest(ProductIdParamSchema, input);
    const record = await this.repository.findById(toProductId(params.id));

    if (record === null) {
      throw new NotFoundError({
        message: "Product not found",
        details: { id: params.id },
      });
    }

    return toProductDto(record);
  }
}
