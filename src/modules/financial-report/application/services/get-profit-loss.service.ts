import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ProfitLossDto } from "../dtos/financial-report.dto";
import {
  toProfitLossDto,
  toProfitLossQuery,
} from "../mappers/financial-report.mapper";
import {
  ProfitLossQuerySchema,
  type ProfitLossQueryInput,
} from "../schemas/financial-report.schemas";

export class GetProfitLossService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: ProfitLossQueryInput): Promise<ProfitLossDto> {
    const query = parseRequest(ProfitLossQuerySchema, input);
    const report = await this.financialReportRepository.getProfitLoss(
      toProfitLossQuery(query),
    );
    return toProfitLossDto(report);
  }
}
