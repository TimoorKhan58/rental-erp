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

function derivePaymentStatus(invoice: RentalInvoice): RentalInvoice {
  try {
    return invoice.withPaymentApplied(invoice.paidAmount);
  } catch (error) {
    if (error instanceof RentalInvoiceInvalidStatusError) {
      throw new ConcurrentUpdateError({
        entity: RENTAL_INVOICE_ENTITY_NAME,
        id: invoice.id,
        action: "derive payment status",
      });
    }

    throw error;
  }
}

async function claimDerivedPaymentStatus(
  rentalInvoiceRepository: IRentalInvoiceRepository,
  invoiceId: RentalInvoiceId,
  invoiceAfterDelta: RentalInvoice,
  direction: "apply" | "reverse",
): Promise<RentalInvoice> {
  const statusDerived = derivePaymentStatus(invoiceAfterDelta);

  if (statusDerived.status === invoiceAfterDelta.status) {
    return invoiceAfterDelta;
  }

  const action =
    direction === "apply"
      ? "derive payment status"
      : "derive payment reversal status";

  const claimed = await rentalInvoiceRepository.claimStatusTransition(
    invoiceId,
    invoiceAfterDelta.status,
    { status: statusDerived.status },
  );

  if (claimed !== null) {
    return claimed;
  }

  const refreshed = await rentalInvoiceRepository.findById(invoiceId);

  if (refreshed === null) {
    throw new ConcurrentUpdateError({
      entity: RENTAL_INVOICE_ENTITY_NAME,
      id: invoiceId,
      action,
    });
  }

  const refreshedDerived = derivePaymentStatus(refreshed);

  if (refreshedDerived.status === refreshed.status) {
    return refreshed;
  }

  const retried = await rentalInvoiceRepository.claimStatusTransition(
    invoiceId,
    refreshed.status,
    { status: refreshedDerived.status },
  );

  if (retried === null) {
    throw new ConcurrentUpdateError({
      entity: RENTAL_INVOICE_ENTITY_NAME,
      id: invoiceId,
      expectedStatus: refreshed.status,
      action,
    });
  }

  return retried;
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

  return claimDerivedPaymentStatus(
    rentalInvoiceRepository,
    invoiceId,
    afterDelta,
    direction,
  );
}
