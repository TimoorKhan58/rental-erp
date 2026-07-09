import type { IReturnRepository } from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";

import { toReturnListQuery } from "../mappers/return-list.mapper";
import { toReturnDto } from "../mappers/return.mapper";
import {
  ListReturnsSchema,
  type ListReturnsInput,
} from "../schemas/list-returns.schema";

export class ListReturnsService {
  constructor(private readonly repository: IReturnRepository) {}

  async execute(input: ListReturnsInput) {
    const query = parseRequest(ListReturnsSchema, input);
    const result = await this.repository.findPaged(toReturnListQuery(query));

    return {
      items: result.items.map((item) => toReturnDto(item)),
      meta: result.meta,
    };
  }
}
