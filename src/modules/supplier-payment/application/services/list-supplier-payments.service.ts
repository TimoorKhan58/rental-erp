import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import {
  toSupplierPaymentDto,
  toSupplierPaymentListQuery,
} from "../mappers/supplier-payment.mapper";
import {
  ListSupplierPaymentsSchema,
  type ListSupplierPaymentsInput,
} from "../schemas/list-supplier-payments.schema";

export class ListSupplierPaymentsService {
  constructor(
    private readonly supplierPaymentRepository: ISupplierPaymentRepository,
  ) {}

  async execute(
    input: ListSupplierPaymentsInput,
  ): Promise<PaginatedResult<SupplierPaymentDto>> {
    const query = parseRequest(ListSupplierPaymentsSchema, input);
    const listQuery = toSupplierPaymentListQuery(query);
    const result = await this.supplierPaymentRepository.findPaged(listQuery);

    return {
      ...result,
      items: result.items.map(toSupplierPaymentDto),
    };
  }
}
