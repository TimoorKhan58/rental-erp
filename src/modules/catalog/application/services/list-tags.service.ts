import type { ITagRepository } from "@/modules/catalog/domain/tag.repository.interface";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { TagDto } from "../dtos/tag.dto";
import {
  toTagDto,
  toTagListQuery,
} from "../mappers/tag.mapper";
import {
  ListTagsSchema,
  type ListTagsInput,
} from "../schemas/list-tags.schema";

export class ListTagsService {
  constructor(private readonly repository: ITagRepository) {}

  async execute(
    input: ListTagsInput,
  ): Promise<PaginatedResult<TagDto>> {
    const query = parseRequest(ListTagsSchema, input);
    const result = await this.repository.findPaged(toTagListQuery(query));

    return {
      items: result.items.map(toTagDto),
      meta: result.meta,
    };
  }
}
