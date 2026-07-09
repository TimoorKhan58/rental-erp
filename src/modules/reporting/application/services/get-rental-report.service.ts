import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RentalReportDto } from "../dtos/reporting.dto";
import {
  toRentalReportDto,
  toRentalReportQuery,
} from "../mappers/reporting.mapper";
import {
  RentalReportQuerySchema,
  type RentalReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetRentalReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: RentalReportQueryInput): Promise<RentalReportDto> {
    const query = parseRequest(RentalReportQuerySchema, input);
    const report = await this.reportingRepository.getRentalReport(
      toRentalReportQuery(query),
    );
    return toRentalReportDto(report);
  }
}
