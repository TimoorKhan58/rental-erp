import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { GeneralLedgerDto } from "../dtos/financial-report.dto";
import {
  toGeneralLedgerDto,
  toGeneralLedgerQuery,
} from "../mappers/financial-report.mapper";
import {
  GeneralLedgerQuerySchema,
  type GeneralLedgerQueryInput,
} from "../schemas/financial-report.schemas";

export class GetGeneralLedgerService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: GeneralLedgerQueryInput): Promise<GeneralLedgerDto> {
    const query = parseRequest(GeneralLedgerQuerySchema, input);
    const report = await this.financialReportRepository.getGeneralLedger(
      toGeneralLedgerQuery(query),
    );
    return toGeneralLedgerDto(report);
  }
}
