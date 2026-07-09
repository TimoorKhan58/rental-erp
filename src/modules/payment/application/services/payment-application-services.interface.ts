import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PaymentDto } from "../dtos/payment.dto";
import type {
  CreatePaymentInput,
  PaymentIdParamInput,
  UpdatePaymentInput,
} from "../schemas/payment.schemas";
import type { ListPaymentsInput } from "../schemas/list-payments.schema";
import type { CreatePaymentService } from "./create-payment.service";
import type { GetPaymentByIdService } from "./get-payment-by-id.service";
import type { ListPaymentsService } from "./list-payments.service";
import type { PostPaymentService } from "./post-payment.service";
import type { UpdatePaymentService } from "./update-payment.service";
import type { VoidPaymentService } from "./void-payment.service";

export interface PaymentApplicationServices {
  getPaymentById: GetPaymentByIdService;
  listPayments: ListPaymentsService;
  createPayment: CreatePaymentService;
  updatePayment: UpdatePaymentService;
  postPayment: PostPaymentService;
  voidPayment: VoidPaymentService;
}

export type PaymentServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => PaymentApplicationServices;

export interface IPaymentService {
  getById(params: PaymentIdParamInput): Promise<PaymentDto>;
  list(input: ListPaymentsInput): Promise<PaginatedResult<PaymentDto>>;
  create(input: CreatePaymentInput): Promise<PaymentDto>;
  update(
    params: PaymentIdParamInput,
    input: UpdatePaymentInput,
  ): Promise<PaymentDto>;
  post(params: PaymentIdParamInput): Promise<PaymentDto>;
  void(params: PaymentIdParamInput): Promise<PaymentDto>;
}
