import type { PaginatedResult } from "@/shared/domain/pagination";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import type {
  CreateSupplierPaymentInput,
  SupplierPaymentIdParamInput,
} from "../schemas/supplier-payment.schemas";
import type { ListSupplierPaymentsInput } from "../schemas/list-supplier-payments.schema";
import type { ISupplierPaymentService } from "./supplier-payment-application-services.interface";
import type { CreateSupplierPaymentService } from "./create-supplier-payment.service";
import type { GetSupplierPaymentByIdService } from "./get-supplier-payment-by-id.service";
import type { ListSupplierPaymentsService } from "./list-supplier-payments.service";
import type { PostSupplierPaymentService } from "./post-supplier-payment.service";
import type { VoidSupplierPaymentService } from "./void-supplier-payment.service";

export class SupplierPaymentService implements ISupplierPaymentService {
  constructor(
    private readonly getSupplierPaymentById: GetSupplierPaymentByIdService,
    private readonly listSupplierPayments: ListSupplierPaymentsService,
    private readonly createSupplierPayment: CreateSupplierPaymentService,
    private readonly postSupplierPayment: PostSupplierPaymentService,
    private readonly voidSupplierPayment: VoidSupplierPaymentService,
  ) {}

  getById(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto> {
    return this.getSupplierPaymentById.execute(params);
  }

  list(
    input: ListSupplierPaymentsInput,
  ): Promise<PaginatedResult<SupplierPaymentDto>> {
    return this.listSupplierPayments.execute(input);
  }

  create(input: CreateSupplierPaymentInput): Promise<SupplierPaymentDto> {
    return this.createSupplierPayment.execute(input);
  }

  post(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto> {
    return this.postSupplierPayment.execute(params);
  }

  void(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto> {
    return this.voidSupplierPayment.execute(params);
  }
}
