import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { RentalOrderSummaryDto } from "../dtos/rental-order-summary.dto";
import { toRentalOrderSummaryDto } from "../dtos/rental-order-summary.dto";
import { toRentalOrderSummaryQuery } from "../mappers/rental-order-summary.mapper";
import {
  GetRentalOrderSummarySchema,
  type GetRentalOrderSummaryInput,
} from "../schemas/get-rental-order-summary.schema";

export class GetRentalOrderSummaryService {
  constructor(private readonly rentalOrderRepository: IRentalOrderRepository) {}

  async execute(input: GetRentalOrderSummaryInput): Promise<RentalOrderSummaryDto> {
    const query = parseRequest(GetRentalOrderSummarySchema, input);
    const summaryQuery = toRentalOrderSummaryQuery(query);
    const result = await this.rentalOrderRepository.findSummaryStats(summaryQuery);

    return toRentalOrderSummaryDto(result);
  }
}
