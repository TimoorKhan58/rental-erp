import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { AccountsSummaryDto } from "../dtos/financial-report.dto";
import {
  toAccountsSummaryDto,
  toAccountsSummaryQuery,
} from "../mappers/financial-report.mapper";
import {
  AccountsSummaryQuerySchema,
  type AccountsSummaryQueryInput,
} from "../schemas/financial-report.schemas";

export class GetAccountsSummaryService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(
    input: AccountsSummaryQueryInput = {},
  ): Promise<AccountsSummaryDto> {
    const query = parseRequest(AccountsSummaryQuerySchema, input);
    const report = await this.financialReportRepository.getAccountsSummary(
      toAccountsSummaryQuery(query),
    );
    return toAccountsSummaryDto(report);
  }
}
