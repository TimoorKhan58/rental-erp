import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import { parseRequest } from "@/shared/application/validation";

import type { PaymentSummaryDto } from "../dtos/payment-summary.dto";
import { toPaymentSummaryDto } from "../dtos/payment-summary.dto";
import { toPaymentSummaryQuery } from "../mappers/payment-summary.mapper";
import {
  GetPaymentSummarySchema,
  type GetPaymentSummaryInput,
} from "../schemas/get-payment-summary.schema";

export class GetPaymentSummaryService {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: GetPaymentSummaryInput): Promise<PaymentSummaryDto> {
    const query = parseRequest(GetPaymentSummarySchema, input);
    const summaryQuery = toPaymentSummaryQuery(query);
    const result = await this.paymentRepository.findSummaryStats(summaryQuery);

    return toPaymentSummaryDto(result);
  }
}
