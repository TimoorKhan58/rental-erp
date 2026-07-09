import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { DashboardSummaryDto } from "../dtos/reporting.dto";
import { toDashboardDto, toDashboardQuery } from "../mappers/reporting.mapper";
import {
  DashboardQuerySchema,
  type DashboardQueryInput,
} from "../schemas/reporting.schemas";

export class GetDashboardService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: DashboardQueryInput): Promise<DashboardSummaryDto> {
    const query = parseRequest(DashboardQuerySchema, input);
    const report = await this.reportingRepository.getDashboard(
      toDashboardQuery(query),
    );
    return toDashboardDto(report);
  }
}
