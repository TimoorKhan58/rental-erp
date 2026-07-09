import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ReturnReportDto } from "../dtos/reporting.dto";
import {
  toReturnReportDto,
  toReturnReportQuery,
} from "../mappers/reporting.mapper";
import {
  ReturnReportQuerySchema,
  type ReturnReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetReturnReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: ReturnReportQueryInput): Promise<ReturnReportDto> {
    const query = parseRequest(ReturnReportQuerySchema, input);
    const report = await this.reportingRepository.getReturnReport(
      toReturnReportQuery(query),
    );
    return toReturnReportDto(report);
  }
}
