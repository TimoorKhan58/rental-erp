import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { CustomerReportDto } from "../dtos/reporting.dto";
import {
  toCustomerReportDto,
  toCustomerReportQuery,
} from "../mappers/reporting.mapper";
import {
  CustomerReportQuerySchema,
  type CustomerReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetCustomerReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: CustomerReportQueryInput): Promise<CustomerReportDto> {
    const query = parseRequest(CustomerReportQuerySchema, input);
    const report = await this.reportingRepository.getCustomerReport(
      toCustomerReportQuery(query),
    );
    return toCustomerReportDto(report);
  }
}
