import {
  Payment,
  PaymentInvariantError,
} from "@/modules/payment/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { PaymentDto } from "../dtos/payment.dto";
import {
  toCreatePaymentData,
  toPaymentDto,
  toRentalInvoiceId,
  toUserId,
} from "../mappers/payment.mapper";
import {
  CreatePaymentSchema,
  type CreatePaymentInput,
} from "../schemas/payment.schemas";
import { toPaymentAuditValues } from "./payment-audit.mapper";
import { validateInvoiceForPayment } from "./payment-invoice.validation";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "./payment-service.constants";
import type { IPaymentTransactionRunner } from "./payment-transaction.runner";

export class CreatePaymentService {
  constructor(
    private readonly transactionRunner: IPaymentTransactionRunner,
  ) {}

  async execute(input: CreatePaymentInput): Promise<PaymentDto> {
    const data = parseRequest(CreatePaymentSchema, input);

    return this.transactionRunner.run(
      async ({ paymentRepository, rentalInvoiceRepository, auditLogger, userId }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create payment",
          });
        }

        const createData = toCreatePaymentData(data, toUserId(userId));

        try {
          Payment.create(createData);
        } catch (error) {
          if (error instanceof PaymentInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const invoice = await rentalInvoiceRepository.findById(
          toRentalInvoiceId(data.rentalInvoiceId),
        );

        if (invoice === null) {
          throw new NotFoundError({
            message: "Rental invoice not found",
            details: { rentalInvoiceId: data.rentalInvoiceId },
          });
        }

        validateInvoiceForPayment(
          invoice,
          data.customerId,
          data.amount,
          data.isRefund === true,
        );

        const existing = await paymentRepository.findByPaymentNumber(
          createData.paymentNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Payment number already exists",
            details: { paymentNumber: createData.paymentNumber },
          });
        }

        const payment = await paymentRepository.create(createData);

        await auditLogger.log({
          module: PAYMENT_MODULE,
          entityName: PAYMENT_ENTITY_NAME,
          recordId: payment.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toPaymentAuditValues(payment),
        });

        return toPaymentDto(payment);
      },
    );
  }
}
