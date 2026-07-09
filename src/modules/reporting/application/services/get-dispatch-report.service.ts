import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { DispatchReportDto } from "../dtos/reporting.dto";
import {
  toDispatchReportDto,
  toDispatchReportQuery,
} from "../mappers/reporting.mapper";
import {
  DispatchReportQuerySchema,
  type DispatchReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetDispatchReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: DispatchReportQueryInput): Promise<DispatchReportDto> {
    const query = parseRequest(DispatchReportQuerySchema, input);
    const report = await this.reportingRepository.getDispatchReport(
      toDispatchReportQuery(query),
    );
    return toDispatchReportDto(report);
  }
}
