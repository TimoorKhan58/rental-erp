import type { IFinancialReportRepository } from "@/modules/financial-report/domain/financial-report.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { JournalReportDto } from "../dtos/financial-report.dto";
import {
  toJournalReportDto,
  toJournalReportQuery,
} from "../mappers/financial-report.mapper";
import {
  JournalReportQuerySchema,
  type JournalReportQueryInput,
} from "../schemas/financial-report.schemas";

export class GetJournalReportService {
  constructor(
    private readonly financialReportRepository: IFinancialReportRepository,
  ) {}

  async execute(input: JournalReportQueryInput): Promise<JournalReportDto> {
    const query = parseRequest(JournalReportQuerySchema, input);
    const report = await this.financialReportRepository.getJournalReport(
      toJournalReportQuery(query),
    );
    return toJournalReportDto(report);
  }
}
