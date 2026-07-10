import type { IAttributeRepository } from "@/modules/catalog/domain/attribute.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { AttributeDto } from "../dtos/attribute.dto";
import {
  toAttributeDto,
  toAttributeListQuery,
} from "../mappers/attribute.mapper";
import {
  ListAttributesSchema,
  type ListAttributesInput,
} from "../schemas/list-attributes.schema";

export class ListAttributesService {
  constructor(private readonly repository: IAttributeRepository) {}

  async execute(
    input: ListAttributesInput,
  ): Promise<PaginatedResult<AttributeDto>> {
    const query = parseRequest(ListAttributesSchema, input);
    const result = await this.repository.findPaged(toAttributeListQuery(query));

    return {
      items: result.items.map(toAttributeDto),
      meta: result.meta,
    };
  }
}
