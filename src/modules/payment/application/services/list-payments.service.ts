import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PaymentDto } from "../dtos/payment.dto";
import { toPaymentDto, toPaymentListQuery } from "../mappers/payment.mapper";
import {
  ListPaymentsSchema,
  type ListPaymentsInput,
} from "../schemas/list-payments.schema";

export class ListPaymentsService {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(input: ListPaymentsInput): Promise<PaginatedResult<PaymentDto>> {
    const query = parseRequest(ListPaymentsSchema, input);
    const listQuery = toPaymentListQuery(query);
    const result = await this.paymentRepository.findPaged(listQuery);

    return {
      ...result,
      items: result.items.map(toPaymentDto),
    };
  }
}
