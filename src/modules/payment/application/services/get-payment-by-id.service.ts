import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { PaymentDto } from "../dtos/payment.dto";
import { toPaymentDto, toPaymentId } from "../mappers/payment.mapper";
import {
  PaymentIdParamSchema,
  type PaymentIdParamInput,
} from "../schemas/payment.schemas";

export class GetPaymentByIdService {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(params: PaymentIdParamInput): Promise<PaymentDto> {
    const { id } = parseRequest(PaymentIdParamSchema, params);

    const payment = await this.paymentRepository.findById(toPaymentId(id));

    if (payment === null) {
      throw new NotFoundError({
        message: "Payment not found",
        details: { id },
      });
    }

    return toPaymentDto(payment);
  }
}
