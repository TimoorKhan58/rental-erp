import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { DispatchSummaryDto } from "../dtos/dispatch-summary.dto";
import { toDispatchSummaryDto } from "../dtos/dispatch-summary.dto";
import { toDispatchSummaryQuery } from "../mappers/dispatch-summary.mapper";
import {
  GetDispatchSummarySchema,
  type GetDispatchSummaryInput,
} from "../schemas/get-dispatch-summary.schema";

export class GetDispatchSummaryService {
  constructor(private readonly dispatchRepository: IDispatchRepository) {}

  async execute(input: GetDispatchSummaryInput): Promise<DispatchSummaryDto> {
    const query = parseRequest(GetDispatchSummarySchema, input);
    const summaryQuery = toDispatchSummaryQuery(query);
    const result = await this.dispatchRepository.findSummaryStats(summaryQuery);

    return toDispatchSummaryDto(result);
  }
}
