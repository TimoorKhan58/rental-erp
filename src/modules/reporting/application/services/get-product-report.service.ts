import type { IReportingRepository } from "@/modules/reporting/domain/reporting.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { ProductReportDto } from "../dtos/reporting.dto";
import {
  toProductReportDto,
  toProductReportQuery,
} from "../mappers/reporting.mapper";
import {
  ProductReportQuerySchema,
  type ProductReportQueryInput,
} from "../schemas/reporting.schemas";

export class GetProductReportService {
  constructor(private readonly reportingRepository: IReportingRepository) {}

  async execute(input: ProductReportQueryInput): Promise<ProductReportDto> {
    const query = parseRequest(ProductReportQuerySchema, input);
    const report = await this.reportingRepository.getProductReport(
      toProductReportQuery(query),
    );
    return toProductReportDto(report);
  }
}
