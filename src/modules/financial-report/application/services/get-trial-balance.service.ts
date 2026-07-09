import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { TrialBalanceDto } from "../dtos/financial-report.dto";
import {
  toTrialBalanceDto,
  toTrialBalanceQuery,
} from "../mappers/financial-report.mapper";
import {
  TrialBalanceQuerySchema,
  type TrialBalanceQueryInput,
} from "../schemas/financial-report.schemas";

export class GetTrialBalanceService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: TrialBalanceQueryInput): Promise<TrialBalanceDto> {
    const query = parseRequest(TrialBalanceQuerySchema, input);
    const report = await this.financialReportRepository.getTrialBalance(
      toTrialBalanceQuery(query),
    );
    return toTrialBalanceDto(report);
  }
}
