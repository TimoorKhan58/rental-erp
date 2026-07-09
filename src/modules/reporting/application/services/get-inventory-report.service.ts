import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { InventoryReportDto } from "../dtos/reporting.dto";
import {
  toInventoryReportDto,
  toInventoryReportQuery,
} from "../mappers/reporting.mapper";
import {
  InventoryReportQuerySchema,
  type InventoryReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetInventoryReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: InventoryReportQueryInput): Promise<InventoryReportDto> {
    const query = parseRequest(InventoryReportQuerySchema, input);
    const report = await this.reportingRepository.getInventoryReport(
      toInventoryReportQuery(query),
    );
    return toInventoryReportDto(report);
  }
}
