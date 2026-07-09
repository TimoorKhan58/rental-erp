import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { WarehouseReportDto } from "../dtos/reporting.dto";
import {
  toWarehouseReportDto,
  toWarehouseReportQuery,
} from "../mappers/reporting.mapper";
import {
  WarehouseReportQuerySchema,
  type WarehouseReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetWarehouseReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: WarehouseReportQueryInput): Promise<WarehouseReportDto> {
    const query = parseRequest(WarehouseReportQuerySchema, input);
    const report = await this.reportingRepository.getWarehouseReport(
      toWarehouseReportQuery(query),
    );
    return toWarehouseReportDto(report);
  }
}
