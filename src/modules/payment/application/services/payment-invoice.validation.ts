import type { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import {
  RentalInvoiceInvalidStatusError,
} from "@/modules/rental-invoice/domain";
import type { Payment } from "@/modules/payment/domain/payment.entity";
import {
  assertCustomerMatchesInvoice,
  assertInvoiceEligibleForPayment,
  assertInvoiceEligibleForRefund,
  assertPaymentAmountWithinBalance,
  assertRefundAmountWithinPaid,
  PaymentEligibilityError,
} from "@/modules/payment/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validateInvoiceForPayment(
  invoice: RentalInvoice,
  customerId: string,
  amount: number,
  isRefund = false,
): void {
  try {
    assertCustomerMatchesInvoice(customerId, invoice.customerId);

    if (isRefund) {
      assertInvoiceEligibleForRefund(invoice.status);
      assertRefundAmountWithinPaid(amount, invoice.paidAmount);
      return;
    }

    assertInvoiceEligibleForPayment(invoice.status);
    assertPaymentAmountWithinBalance(amount, invoice.balance);
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
  invoice: RentalInvoice,
  payment: Payment,
  direction: "apply" | "reverse",
): Promise<RentalInvoice> {
  const delta = direction === "apply" ? payment.amount : -payment.amount;
  const updatedInvoice = invoice.withPaymentApplied(invoice.paidAmount + delta);

  return rentalInvoiceRepository.updateStatus(invoice.id, {
    status: updatedInvoice.status,
    paidAmount: updatedInvoice.paidAmount,
    balance: updatedInvoice.balance,
  });
}
