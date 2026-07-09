import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { AccountLedgerDto } from "../dtos/financial-report.dto";
import {
  toAccountLedgerDto,
  toAccountLedgerQuery,
} from "../mappers/financial-report.mapper";
import {
  AccountLedgerQuerySchema,
  type AccountLedgerQueryInput,
} from "../schemas/financial-report.schemas";

export class GetAccountLedgerService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: AccountLedgerQueryInput): Promise<AccountLedgerDto> {
    const query = parseRequest(AccountLedgerQuerySchema, input);
    const report = await this.financialReportRepository.getAccountLedger(
      toAccountLedgerQuery(query),
    );
    return toAccountLedgerDto(report);
  }
}
