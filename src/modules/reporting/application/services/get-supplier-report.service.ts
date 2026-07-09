import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { SupplierReportDto } from "../dtos/reporting.dto";
import {
  toSupplierReportDto,
  toSupplierReportQuery,
} from "../mappers/reporting.mapper";
import {
  SupplierReportQuerySchema,
  type SupplierReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetSupplierReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: SupplierReportQueryInput): Promise<SupplierReportDto> {
    const query = parseRequest(SupplierReportQuerySchema, input);
    const report = await this.reportingRepository.getSupplierReport(
      toSupplierReportQuery(query),
    );
    return toSupplierReportDto(report);
  }
}
