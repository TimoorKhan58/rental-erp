import type { IAttributeRepository } from "@/modules/catalog/domain/attribute.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { AttributeDto } from "../dtos/attribute.dto";
import {
  toAttributeDto,
  toAttributeId,
} from "../mappers/attribute.mapper";
import {
  AttributeIdParamSchema,
  type AttributeIdParamInput,
} from "../schemas/attribute.schemas";

export class GetAttributeByIdService {
  constructor(private readonly repository: IAttributeRepository) {}

  async execute(input: AttributeIdParamInput): Promise<AttributeDto> {
    const params = parseRequest(AttributeIdParamSchema, input);
    const entity = await this.repository.findById(toAttributeId(params.id));

    if (entity === null) {
      throw new NotFoundError({
        message: "Product attribute not found",
        details: { id: params.id },
      });
    }

    return toAttributeDto(entity);
  }
}
