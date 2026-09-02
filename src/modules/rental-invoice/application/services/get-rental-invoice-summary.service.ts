import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RentalInvoiceSummaryDto } from "../dtos/rental-invoice-summary.dto";
import { toRentalInvoiceSummaryDto } from "../dtos/rental-invoice-summary.dto";
import { toRentalInvoiceSummaryQuery } from "../mappers/rental-invoice-summary.mapper";
import {
  GetRentalInvoiceSummarySchema,
  type GetRentalInvoiceSummaryInput,
} from "../schemas/get-rental-invoice-summary.schema";

export class GetRentalInvoiceSummaryService {
  constructor(
    private readonly rentalInvoiceRepository: IRentalInvoiceRepository,
  ) {}

  async execute(
    input: GetRentalInvoiceSummaryInput,
  ): Promise<RentalInvoiceSummaryDto> {
    const query = parseRequest(GetRentalInvoiceSummarySchema, input);
    const summaryQuery = toRentalInvoiceSummaryQuery(query);
    const result = await this.rentalInvoiceRepository.findSummaryStats(summaryQuery);

    return toRentalInvoiceSummaryDto(result);
  }
}
