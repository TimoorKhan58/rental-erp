import type { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import {
  RentalInvoiceInvalidStatusError,
} from "@/modules/rental-invoice/domain";
import {
  RENTAL_INVOICE_ENTITY_NAME,
} from "@/modules/rental-invoice/application/services/rental-invoice-service.constants";
import type { Payment } from "@/modules/payment/domain/payment.entity";
import {
  assertCustomerMatchesInvoice,
  assertInvoiceEligibleForPayment,
  assertPaymentAmountWithinBalance,
  PaymentEligibilityError,
} from "@/modules/payment/domain";
import type { RentalInvoiceId } from "@/shared/domain/ids";
import {
  ConcurrentUpdateError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

export function validateInvoiceForPayment(
  invoice: RentalInvoice,
  customerId: string,
  amount: number,
  options?: { pendingAmount?: number },
): void {
  try {
    assertInvoiceEligibleForPayment(invoice.status);
    assertCustomerMatchesInvoice(customerId, invoice.customerId);
    const pendingAmount = options?.pendingAmount ?? 0;
    const availableBalance = Math.max(0, invoice.balance - pendingAmount);
    assertPaymentAmountWithinBalance(amount, availableBalance);
  } catch (error) {
    if (
      error instanceof PaymentEligibilityError ||
      error instanceof RentalInvoiceInvalidStatusError
    ) {
      throw new UnprocessableError({
        message: error.message,
      });
    }

    throw error;
  }
}

export async function applyPaymentToInvoice(
  rentalInvoiceRepository: IRentalInvoiceRepository,
  invoiceId: RentalInvoiceId,
  payment: Payment,
  direction: "apply" | "reverse",
): Promise<RentalInvoice> {
  const delta = direction === "apply" ? payment.amount : -payment.amount;
  const afterDelta = await rentalInvoiceRepository.applyPaymentDelta(
    invoiceId,
    delta,
  );

  if (afterDelta === null) {
    throw new ConcurrentUpdateError({
      entity: RENTAL_INVOICE_ENTITY_NAME,
      id: invoiceId,
      action: direction === "apply" ? "apply payment" : "reverse payment",
    });
  }

  const statusDerived = afterDelta.withPaymentApplied(afterDelta.paidAmount);

  if (statusDerived.status !== afterDelta.status) {
    return rentalInvoiceRepository.updateStatus(invoiceId, {
      status: statusDerived.status,
    });
  }

  return afterDelta;
}
