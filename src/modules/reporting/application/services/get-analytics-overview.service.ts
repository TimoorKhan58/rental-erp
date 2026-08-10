import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { resolveReportPeriod } from "@/modules/reporting/domain/reporting.rules";
import { parseRequest } from "@/shared/application/validation";

import type { AnalyticsOverviewDto } from "../dtos/reporting.dto";
import {
  toAnalyticsOverviewDto,
  toAnalyticsOverviewQuery,
} from "../mappers/reporting.mapper";
import {
  AnalyticsOverviewQuerySchema,
  type AnalyticsOverviewQueryInput,
} from "../schemas/reporting.schemas";

/**
 * Composes frozen Phase 24 analytics metrics.
 * Operational metrics: reporting repository.
 * Recognized revenue: financial-report repository (no duplicate GL math).
 */
export class GetAnalyticsOverviewService {
  constructor(
    private readonly reportingRepository: IReportingRepository,
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(
    input: AnalyticsOverviewQueryInput,
  ): Promise<AnalyticsOverviewDto> {
    const query = parseRequest(AnalyticsOverviewQuerySchema, input);
    const period = resolveReportPeriod(toAnalyticsOverviewQuery(query));
    const boundedQuery = {
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
    };

    const [operational, revenueSummary] = await Promise.all([
      this.reportingRepository.getAnalyticsOverview(boundedQuery),
      this.financialReportRepository.getRevenueSummary(boundedQuery),
    ]);

    return toAnalyticsOverviewDto({
      ...operational,
      recognizedRevenue: revenueSummary.totalRevenue,
    });
  }
}
