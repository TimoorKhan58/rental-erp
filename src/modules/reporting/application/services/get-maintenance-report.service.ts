import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { MaintenanceReportDto } from "../dtos/reporting.dto";
import {
  toMaintenanceReportDto,
  toMaintenanceReportQuery,
} from "../mappers/reporting.mapper";
import {
  MaintenanceReportQuerySchema,
  type MaintenanceReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetMaintenanceReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(
    input: MaintenanceReportQueryInput,
  ): Promise<MaintenanceReportDto> {
    const query = parseRequest(MaintenanceReportQuerySchema, input);
    const report = await this.reportingRepository.getMaintenanceReport(
      toMaintenanceReportQuery(query),
    );
    return toMaintenanceReportDto(report);
  }
}
