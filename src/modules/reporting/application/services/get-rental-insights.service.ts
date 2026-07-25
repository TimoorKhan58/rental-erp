import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RentalInsightsReportDto } from "../dtos/reporting.dto";
import {
  toRentalInsightsDto,
  toRentalInsightsQuery,
} from "../mappers/reporting.mapper";
import {
  RentalInsightsQuerySchema,
  type RentalInsightsQueryInput,
} from "../schemas/reporting.schemas";

export class GetRentalInsightsService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: RentalInsightsQueryInput): Promise<RentalInsightsReportDto> {
    const query = parseRequest(RentalInsightsQuerySchema, input);
    const report = await this.reportingRepository.getRentalInsights(
      toRentalInsightsQuery(query),
    );
    return toRentalInsightsDto(report);
  }
}
