import type { ITagRepository } from "@/modules/catalog/domain/tag.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { TagDto } from "../dtos/tag.dto";
import {
  toTagDto,
  toTagId,
} from "../mappers/tag.mapper";
import {
  TagIdParamSchema,
  type TagIdParamInput,
} from "../schemas/tag.schemas";

export class GetTagByIdService {
  constructor(private readonly repository: ITagRepository) {}

  async execute(input: TagIdParamInput): Promise<TagDto> {
    const params = parseRequest(TagIdParamSchema, input);
    const entity = await this.repository.findById(toTagId(params.id));

    if (entity === null) {
      throw new NotFoundError({
        message: "Product tag not found",
        details: { id: params.id },
      });
    }

    return toTagDto(entity);
  }
}
