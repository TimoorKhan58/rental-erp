import type { PaginatedResult } from "@/shared/domain/pagination";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import type {
  CreateSupplierPaymentInput,
  SupplierPaymentIdParamInput,
} from "../schemas/supplier-payment.schemas";
import type { ListSupplierPaymentsInput } from "../schemas/list-supplier-payments.schema";
import type { CreateSupplierPaymentService } from "./create-supplier-payment.service";
import type { GetSupplierPaymentByIdService } from "./get-supplier-payment-by-id.service";
import type { ListSupplierPaymentsService } from "./list-supplier-payments.service";
import type { PostSupplierPaymentService } from "./post-supplier-payment.service";
import type { VoidSupplierPaymentService } from "./void-supplier-payment.service";

export interface SupplierPaymentApplicationServices {
  getSupplierPaymentById: GetSupplierPaymentByIdService;
  listSupplierPayments: ListSupplierPaymentsService;
  createSupplierPayment: CreateSupplierPaymentService;
  postSupplierPayment: PostSupplierPaymentService;
  voidSupplierPayment: VoidSupplierPaymentService;
}

export type SupplierPaymentServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => SupplierPaymentApplicationServices;

export interface ISupplierPaymentService {
  getById(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto>;
  list(
    input: ListSupplierPaymentsInput,
  ): Promise<PaginatedResult<SupplierPaymentDto>>;
  create(input: CreateSupplierPaymentInput): Promise<SupplierPaymentDto>;
  post(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto>;
  void(params: SupplierPaymentIdParamInput): Promise<SupplierPaymentDto>;
}
