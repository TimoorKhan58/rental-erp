import { z } from "zod";

import { buildBusinessInsights, resolveBusinessInsightsWindow } from "@/modules/reporting/domain/business-insights.rules";
import {
  BUSINESS_INSIGHTS_PERIOD_MONTHS,
  type BusinessInsights,
  type BusinessInsightsPeriodMonths,
} from "@/modules/reporting/domain/business-insights.types";
import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { getBusinessTimeZone } from "@/shared/infrastructure/time/business-clock";
import { businessDay } from "@/shared/infrastructure/time/business-day";

export const BusinessInsightsQuerySchema = z.object({
  months: z
    .enum(BUSINESS_INSIGHTS_PERIOD_MONTHS.map(String) as [string, ...string[]])
    .optional(),
});

export type BusinessInsightsQueryInput = z.input<typeof BusinessInsightsQuerySchema>;

/** Dashboard business insights for the last 3, 6, 12 (default) or 24 months. */
export class GetBusinessInsightsService {
  constructor(
    private readonly reportingRepository: IReportingRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: BusinessInsightsQueryInput = {}): Promise<BusinessInsights> {
    const query = parseRequest(BusinessInsightsQuerySchema, input);
    const months = Number(query.months ?? 12) as BusinessInsightsPeriodMonths;
    const now = this.clock();
    const timeZone = await getBusinessTimeZone();
    const businessToday = businessDay(timeZone, now);
    const window = resolveBusinessInsightsWindow(months, businessToday);
    const since = new Date(
      Math.min(window.previousFrom.getTime(), window.seasonFrom.getTime()),
    );

    const source = await this.reportingRepository.getBusinessInsightsSource(since);

    return buildBusinessInsights({ source, months, businessToday, now, timeZone });
  }
}
