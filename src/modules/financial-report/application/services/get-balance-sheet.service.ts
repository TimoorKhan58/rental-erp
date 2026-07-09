import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { BalanceSheetDto } from "../dtos/financial-report.dto";
import {
  toBalanceSheetDto,
  toBalanceSheetQuery,
} from "../mappers/financial-report.mapper";
import {
  BalanceSheetQuerySchema,
  type BalanceSheetQueryInput,
} from "../schemas/financial-report.schemas";

export class GetBalanceSheetService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: BalanceSheetQueryInput): Promise<BalanceSheetDto> {
    const query = parseRequest(BalanceSheetQuerySchema, input);
    const report = await this.financialReportRepository.getBalanceSheet(
      toBalanceSheetQuery(query),
    );
    return toBalanceSheetDto(report);
  }
}
