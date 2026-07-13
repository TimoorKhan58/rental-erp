import { Payment, PaymentInvariantError } from "@/modules/payment/domain";
import type { PaymentDto } from "@/modules/payment/application/dtos/payment.dto";
import { toPaymentDto } from "@/modules/payment/application/mappers/payment.mapper";
import { toPaymentAuditValues } from "@/modules/payment/application/services/payment-audit.mapper";
import {
  applyPaymentToInvoice,
  validateInvoiceForPayment,
} from "@/modules/payment/application/services/payment-invoice.validation";
import {
  PAYMENT_ENTITY_NAME,
  PAYMENT_MODULE,
} from "@/modules/payment/application/services/payment-service.constants";
import { RENTAL_ORDER_REFERENCE_TYPE } from "@/modules/rental-order/domain/rental-order.constants";
import { toRentalInvoiceAuditValues } from "@/modules/rental-invoice/application/services/rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import { executeCreateStockMovementInScope } from "@/modules/stock-movement/application/services/create-stock-movement-in-scope";
import {
  ReturnInvalidItemError,
  ReturnInvalidStatusError,
} from "@/modules/return/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { RentalInvoiceId, UserId } from "@/shared/domain/ids";

import type { ReturnDto } from "../dtos/return.dto";
import { toProductId, toReturnDto, toReturnId } from "../mappers/return.mapper";
import {
  RecoverLostReturnSchema,
  ReturnIdParamSchema,
  type RecoverLostReturnInput,
  type ReturnIdParamInput,
} from "../schemas/return.schemas";
import { toReturnAuditValues } from "./return-audit.mapper";
import {
  RETURN_ENTITY_NAME,
  RETURN_MODULE,
} from "./return-service.constants";
import type { IReturnTransactionRunner } from "./return-transaction.runner";

export interface RecoverLostReturnResult {
  return: ReturnDto;
  refund: PaymentDto | null;
}

export class RecoverLostItemsService {
  constructor(
    private readonly transactionRunner: IReturnTransactionRunner,
  ) {}

  async execute(
    params: ReturnIdParamInput,
    input: RecoverLostReturnInput,
  ): Promise<RecoverLostReturnResult> {
    const { id } = parseRequest(ReturnIdParamSchema, params);
    const data = parseRequest(RecoverLostReturnSchema, input);

    return this.transactionRunner.run(
      async ({
        returnRepository,
        rentalOrderRepository,
        inventoryRepository,
        stockMovementRepository,
        paymentRepository,
        rentalInvoiceRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to recover lost items",
          });
        }

        const existing = await returnRepository.findById(toReturnId(id));

        if (existing === null) {
          throw new NotFoundError({
            message: "Return not found",
            details: { id },
          });
        }

        let recovered;

        try {
          recovered = existing.withLostRecovered(data.items);
        } catch (error) {
          if (error instanceof ReturnInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          if (error instanceof ReturnInvalidItemError) {
            throw new UnprocessableError({
              message: error.message,
              details:
                error.rentalOrderItemId !== undefined
                  ? { rentalOrderItemId: error.rentalOrderItemId }
                  : undefined,
            });
          }

          throw error;
        }

        const rentalOrder = await rentalOrderRepository.findById(
          existing.rentalOrderId,
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: existing.rentalOrderId },
          });
        }

        const previousValues = toReturnAuditValues(existing);

        for (const recoverItem of data.items) {
          const rentalItem = rentalOrder.items.find(
            (item) => item.id === recoverItem.rentalOrderItemId,
          );

          if (rentalItem === undefined) {
            throw new UnprocessableError({
              message: "Recover item does not belong to rental order",
              details: { rentalOrderItemId: recoverItem.rentalOrderItemId },
            });
          }

          const inventory = await inventoryRepository.findByProductAndWarehouse(
            toProductId(rentalItem.productId),
            rentalOrder.warehouseId,
          );

          if (inventory === null) {
            throw new NotFoundError({
              message: "Inventory not found for product and warehouse",
              details: {
                productId: rentalItem.productId,
                warehouseId: rentalOrder.warehouseId,
              },
            });
          }

          await executeCreateStockMovementInScope(
            {
              stockMovementRepository,
              inventoryRepository,
              auditLogger,
              userId,
            },
            {
              inventoryId: inventory.id,
              movementType: "IN",
              quantity: recoverItem.quantity,
              referenceType: RENTAL_ORDER_REFERENCE_TYPE,
              referenceId: rentalOrder.id,
              remarks: `Recovered lost item for return ${existing.returnNumber} / order ${rentalOrder.orderNumber}`,
            },
          );
        }

        const updated = await returnRepository.updateStatus(existing.id, {
          status: recovered.status,
          items: recovered.items,
        });

        await auditLogger.log({
          module: RETURN_MODULE,
          entityName: RETURN_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: {
            ...toReturnAuditValues(updated),
            recoveredItems: data.items,
          },
        });

        let refundDto: PaymentDto | null = null;

        if (data.refund !== undefined) {
          const invoice = await rentalInvoiceRepository.findById(
            data.refund.rentalInvoiceId as RentalInvoiceId,
          );

          if (invoice === null) {
            throw new NotFoundError({
              message: "Rental invoice not found",
              details: { rentalInvoiceId: data.refund.rentalInvoiceId },
            });
          }

          if (invoice.rentalOrderId !== rentalOrder.id) {
            throw new UnprocessableError({
              message: "Invoice does not belong to the return rental order",
            });
          }

          validateInvoiceForPayment(
            invoice,
            invoice.customerId,
            data.refund.amount,
            true,
          );

          const paymentDate =
            data.refund.paymentDate !== undefined
              ? new Date(data.refund.paymentDate)
              : new Date();

          let createPaymentData;

          try {
            createPaymentData = Payment.create({
              paymentNumber: data.refund.paymentNumber,
              rentalInvoiceId: invoice.id,
              customerId: invoice.customerId,
              paymentDate,
              paymentMethod: data.refund.paymentMethod ?? "CASH",
              amount: data.refund.amount,
              isRefund: true,
              referenceNumber: data.refund.referenceNumber ?? null,
              notes:
                data.refund.notes ??
                `Refund for recovered lost item(s) on return ${existing.returnNumber}`,
              createdById: userId as UserId,
            });
          } catch (error) {
            if (error instanceof PaymentInvariantError) {
              throw new UnprocessableError({
                message: error.message,
                details: { field: error.field },
              });
            }

            throw error;
          }

          const existingPayment = await paymentRepository.findByPaymentNumber(
            createPaymentData.paymentNumber,
          );

          if (existingPayment !== null) {
            throw new ConflictError({
              message: "Payment number already exists",
              details: { paymentNumber: createPaymentData.paymentNumber },
            });
          }

          const pendingRefund = await paymentRepository.create(createPaymentData);
          const previousInvoiceValues = toRentalInvoiceAuditValues(invoice);
          const previousPaymentValues = toPaymentAuditValues(pendingRefund);

          const updatedInvoice = await applyPaymentToInvoice(
            rentalInvoiceRepository,
            invoice,
            pendingRefund,
            "reverse",
          );

          const posted = pendingRefund.withPosted();
          const refund = await paymentRepository.updateStatus(pendingRefund.id, {
            status: posted.status,
            postedAt: posted.postedAt,
          });

          await auditLogger.log({
            module: PAYMENT_MODULE,
            entityName: PAYMENT_ENTITY_NAME,
            recordId: refund.id,
            action: "PAYMENT_RECEIVED",
            status: "SUCCESS",
            oldValues: previousPaymentValues,
            newValues: toPaymentAuditValues(refund),
          });

          await auditLogger.log({
            module: RENTAL_INVOICE_MODULE,
            entityName: RENTAL_INVOICE_ENTITY_NAME,
            recordId: updatedInvoice.id,
            action: "UPDATE",
            status: "SUCCESS",
            oldValues: previousInvoiceValues,
            newValues: toRentalInvoiceAuditValues(updatedInvoice),
          });

          refundDto = toPaymentDto(refund);
        }

        return {
          return: toReturnDto(updated),
          refund: refundDto,
        };
      },
    );
  }
}
