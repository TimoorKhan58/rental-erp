import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ExpenseSummaryDto } from "../dtos/financial-report.dto";
import {
  toExpenseSummaryDto,
  toExpenseSummaryQuery,
} from "../mappers/financial-report.mapper";
import {
  ExpenseSummaryQuerySchema,
  type ExpenseSummaryQueryInput,
} from "../schemas/financial-report.schemas";

export class GetExpenseSummaryService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: ExpenseSummaryQueryInput): Promise<ExpenseSummaryDto> {
    const query = parseRequest(ExpenseSummaryQuerySchema, input);
    const report = await this.financialReportRepository.getExpenseSummary(
      toExpenseSummaryQuery(query),
    );
    return toExpenseSummaryDto(report);
  }
}
