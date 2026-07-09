import type { PaginatedResult } from "@/shared/domain/pagination";

import type { PaymentDto } from "../dtos/payment.dto";
import type {
  CreatePaymentInput,
  PaymentIdParamInput,
  UpdatePaymentInput,
} from "../schemas/payment.schemas";
import type { ListPaymentsInput } from "../schemas/list-payments.schema";
import type { IPaymentService } from "./payment-application-services.interface";
import type { CreatePaymentService } from "./create-payment.service";
import type { GetPaymentByIdService } from "./get-payment-by-id.service";
import type { ListPaymentsService } from "./list-payments.service";
import type { PostPaymentService } from "./post-payment.service";
import type { UpdatePaymentService } from "./update-payment.service";
import type { VoidPaymentService } from "./void-payment.service";

export class PaymentService implements IPaymentService {
  constructor(
    private readonly getPaymentById: GetPaymentByIdService,
    private readonly listPayments: ListPaymentsService,
    private readonly createPayment: CreatePaymentService,
    private readonly updatePayment: UpdatePaymentService,
    private readonly postPayment: PostPaymentService,
    private readonly voidPayment: VoidPaymentService,
  ) {}

  getById(params: PaymentIdParamInput): Promise<PaymentDto> {
    return this.getPaymentById.execute(params);
  }

  list(input: ListPaymentsInput): Promise<PaginatedResult<PaymentDto>> {
    return this.listPayments.execute(input);
  }

  create(input: CreatePaymentInput): Promise<PaymentDto> {
    return this.createPayment.execute(input);
  }

  update(
    params: PaymentIdParamInput,
    input: UpdatePaymentInput,
  ): Promise<PaymentDto> {
    return this.updatePayment.execute(params, input);
  }

  post(params: PaymentIdParamInput): Promise<PaymentDto> {
    return this.postPayment.execute(params);
  }

  void(params: PaymentIdParamInput): Promise<PaymentDto> {
    return this.voidPayment.execute(params);
  }
}
