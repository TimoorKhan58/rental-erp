import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { BrandDto } from "../dtos/brand.dto";
import {
  toBrandDto,
  toBrandId,
} from "../mappers/brand.mapper";
import {
  BrandIdParamSchema,
  type BrandIdParamInput,
} from "../schemas/brand.schemas";

export class GetBrandByIdService {
  constructor(private readonly repository: IBrandRepository) {}

  async execute(input: BrandIdParamInput): Promise<BrandDto> {
    const params = parseRequest(BrandIdParamSchema, input);
    const entity = await this.repository.findById(toBrandId(params.id));

    if (entity === null) {
      throw new NotFoundError({
        message: "Brand not found",
        details: { id: params.id },
      });
    }

    return toBrandDto(entity);
  }
}
