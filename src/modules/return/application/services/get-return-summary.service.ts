import type { IReturnRepository } from "@/modules/return/domain/return.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ReturnSummaryDto } from "../dtos/return-summary.dto";
import { toReturnSummaryDto } from "../dtos/return-summary.dto";
import { toReturnSummaryQuery } from "../mappers/return-summary.mapper";
import {
  GetReturnSummarySchema,
  type GetReturnSummaryInput,
} from "../schemas/get-return-summary.schema";

export class GetReturnSummaryService {
  constructor(private readonly returnRepository: IReturnRepository) {}

  async execute(input: GetReturnSummaryInput): Promise<ReturnSummaryDto> {
    const query = parseRequest(GetReturnSummarySchema, input);
    const summaryQuery = toReturnSummaryQuery(query);
    const result = await this.returnRepository.findSummaryStats(summaryQuery);

    return toReturnSummaryDto(result);
  }
}
