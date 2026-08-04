import type { SupplierPaymentApplicationServices as SupplierPaymentApplicationServicesBase } from "@/modules/supplier-payment/application/services/supplier-payment-application-services.interface";
import { CreateSupplierPaymentService } from "@/modules/supplier-payment/application/services/create-supplier-payment.service";
import { GetSupplierPaymentByIdService } from "@/modules/supplier-payment/application/services/get-supplier-payment-by-id.service";
import { ListSupplierPaymentsService } from "@/modules/supplier-payment/application/services/list-supplier-payments.service";
import { SupplierPaymentService } from "@/modules/supplier-payment/application/services/supplier-payment.service";
import type { ISupplierPaymentService } from "@/modules/supplier-payment/application/services/supplier-payment-application-services.interface";
import { PostSupplierPaymentService } from "@/modules/supplier-payment/application/services/post-supplier-payment.service";
import { VoidSupplierPaymentService } from "@/modules/supplier-payment/application/services/void-supplier-payment.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createNumberSequenceRepositoryFromSharedDeps } from "@/modules/settings/infrastructure/factories/create-number-sequence.repository";

import { createSupplierPaymentRepositoryFromSharedDeps } from "./create-supplier-payment.repository";
import { createSupplierPaymentTransactionRunner } from "./create-supplier-payment-transaction.runner";

export type { SupplierPaymentApplicationServicesBase as SupplierPaymentApplicationServices };

export interface WiredSupplierPaymentApplicationServices
  extends SupplierPaymentApplicationServicesBase {
  supplierPaymentService: ISupplierPaymentService;
}

export function createSupplierPaymentApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredSupplierPaymentApplicationServices {
  const repository = createSupplierPaymentRepositoryFromSharedDeps(deps);
  const transactionRunner = createSupplierPaymentTransactionRunner(deps, {
    userId,
  });
  const numberSequences = createNumberSequenceRepositoryFromSharedDeps(deps);

  const getSupplierPaymentById = new GetSupplierPaymentByIdService(repository);
  const listSupplierPayments = new ListSupplierPaymentsService(repository);
  const createSupplierPayment = new CreateSupplierPaymentService(
    transactionRunner,
    numberSequences,
  );
  const postSupplierPayment = new PostSupplierPaymentService(transactionRunner);
  const voidSupplierPayment = new VoidSupplierPaymentService(transactionRunner);

  return {
    getSupplierPaymentById,
    listSupplierPayments,
    createSupplierPayment,
    postSupplierPayment,
    voidSupplierPayment,
    supplierPaymentService: new SupplierPaymentService(
      getSupplierPaymentById,
      listSupplierPayments,
      createSupplierPayment,
      postSupplierPayment,
      voidSupplierPayment,
    ),
  };
}
