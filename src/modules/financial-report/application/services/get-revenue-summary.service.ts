import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RevenueSummaryDto } from "../dtos/financial-report.dto";
import {
  toRevenueSummaryDto,
  toRevenueSummaryQuery,
} from "../mappers/financial-report.mapper";
import {
  RevenueSummaryQuerySchema,
  type RevenueSummaryQueryInput,
} from "../schemas/financial-report.schemas";

export class GetRevenueSummaryService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: RevenueSummaryQueryInput): Promise<RevenueSummaryDto> {
    const query = parseRequest(RevenueSummaryQuerySchema, input);
    const report = await this.financialReportRepository.getRevenueSummary(
      toRevenueSummaryQuery(query),
    );
    return toRevenueSummaryDto(report);
  }
}
