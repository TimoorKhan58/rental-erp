import type { PaymentApplicationServices as PaymentApplicationServicesBase } from "@/modules/payment/application/services/payment-application-services.interface";
import { CreatePaymentService } from "@/modules/payment/application/services/create-payment.service";
import { GetPaymentByIdService } from "@/modules/payment/application/services/get-payment-by-id.service";
import { ListPaymentsService } from "@/modules/payment/application/services/list-payments.service";
import { PaymentService } from "@/modules/payment/application/services/payment.service";
import type { IPaymentService } from "@/modules/payment/application/services/payment-application-services.interface";
import { PostPaymentService } from "@/modules/payment/application/services/post-payment.service";
import { UpdatePaymentService } from "@/modules/payment/application/services/update-payment.service";
import { VoidPaymentService } from "@/modules/payment/application/services/void-payment.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createPaymentRepositoryFromSharedDeps } from "./create-payment.repository";
import { createPaymentTransactionRunner } from "./create-payment-transaction.runner";

export type { PaymentApplicationServicesBase as PaymentApplicationServices };

export interface WiredPaymentApplicationServices
  extends PaymentApplicationServicesBase {
  paymentService: IPaymentService;
}

export function createPaymentApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredPaymentApplicationServices {
  const repository = createPaymentRepositoryFromSharedDeps(deps);
  const transactionRunner = createPaymentTransactionRunner(deps, { userId });

  const getPaymentById = new GetPaymentByIdService(repository);
  const listPayments = new ListPaymentsService(repository);
  const createPayment = new CreatePaymentService(transactionRunner);
  const updatePayment = new UpdatePaymentService(transactionRunner);
  const postPayment = new PostPaymentService(transactionRunner);
  const voidPayment = new VoidPaymentService(transactionRunner);

  return {
    getPaymentById,
    listPayments,
    createPayment,
    updatePayment,
    postPayment,
    voidPayment,
    paymentService: new PaymentService(
      getPaymentById,
      listPayments,
      createPayment,
      updatePayment,
      postPayment,
      voidPayment,
    ),
  };
}
