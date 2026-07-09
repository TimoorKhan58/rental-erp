import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { CashFlowSummaryDto } from "../dtos/financial-report.dto";
import {
  toCashFlowSummaryDto,
  toCashFlowSummaryQuery,
} from "../mappers/financial-report.mapper";
import {
  CashFlowSummaryQuerySchema,
  type CashFlowSummaryQueryInput,
} from "../schemas/financial-report.schemas";

export class GetCashFlowSummaryService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(
    input: CashFlowSummaryQueryInput,
  ): Promise<CashFlowSummaryDto> {
    const query = parseRequest(CashFlowSummaryQuerySchema, input);
    const report = await this.financialReportRepository.getCashFlowSummary(
      toCashFlowSummaryQuery(query),
    );
    return toCashFlowSummaryDto(report);
  }
}
