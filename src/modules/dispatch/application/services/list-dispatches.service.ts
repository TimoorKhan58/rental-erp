import type { IDispatchRepository } from "@/modules/dispatch/domain";
import { parseRequest } from "@/shared/application/validation";

import { toDispatchListQuery } from "../mappers/dispatch-list.mapper";
import { toDispatchDto } from "../mappers/dispatch.mapper";
import {
  ListDispatchesSchema,
  type ListDispatchesInput,
} from "../schemas/list-dispatches.schema";

export class ListDispatchesService {
  constructor(private readonly repository: IDispatchRepository) {}

  async execute(input: ListDispatchesInput) {
    const query = parseRequest(ListDispatchesSchema, input);
    const result = await this.repository.findPaged(toDispatchListQuery(query));

    return {
      items: result.items.map((item) => toDispatchDto(item)),
      meta: result.meta,
    };
  }
}
