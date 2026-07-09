import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RepairReportDto } from "../dtos/reporting.dto";
import {
  toRepairReportDto,
  toRepairReportQuery,
} from "../mappers/reporting.mapper";
import {
  RepairReportQuerySchema,
  type RepairReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetRepairReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: RepairReportQueryInput): Promise<RepairReportDto> {
    const query = parseRequest(RepairReportQuerySchema, input);
    const report = await this.reportingRepository.getRepairReport(
      toRepairReportQuery(query),
    );
    return toRepairReportDto(report);
  }
}
