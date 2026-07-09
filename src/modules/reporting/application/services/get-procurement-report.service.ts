import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ProcurementReportDto } from "../dtos/reporting.dto";
import {
  toProcurementReportDto,
  toProcurementReportQuery,
} from "../mappers/reporting.mapper";
import {
  ProcurementReportQuerySchema,
  type ProcurementReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetProcurementReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(
    input: ProcurementReportQueryInput,
  ): Promise<ProcurementReportDto> {
    const query = parseRequest(ProcurementReportQuerySchema, input);
    const report = await this.reportingRepository.getProcurementReport(
      toProcurementReportQuery(query),
    );
    return toProcurementReportDto(report);
  }
}
