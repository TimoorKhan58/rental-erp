import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import {
  toSupplierPaymentDto,
  toSupplierPaymentId,
} from "../mappers/supplier-payment.mapper";
import {
  SupplierPaymentIdParamSchema,
  type SupplierPaymentIdParamInput,
} from "../schemas/supplier-payment.schemas";

export class GetSupplierPaymentByIdService {
  constructor(
    private readonly supplierPaymentRepository: ISupplierPaymentRepository,
  ) {}

  async execute(
    params: SupplierPaymentIdParamInput,
  ): Promise<SupplierPaymentDto> {
    const { id } = parseRequest(SupplierPaymentIdParamSchema, params);

    const payment = await this.supplierPaymentRepository.findById(
      toSupplierPaymentId(id),
    );

    if (payment === null) {
      throw new NotFoundError({
        message: "Supplier payment not found",
        details: { id },
      });
    }

    return toSupplierPaymentDto(payment);
  }
}
