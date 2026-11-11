import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import type { RentalInvoiceId } from "@/shared/domain/ids";
import { UnprocessableError } from "@/shared/infrastructure/errors";

/**
 * Phase 52 (DL-51-02 / N-44-05): invoice void is forbidden while live POSTED
 * customer payments reference the invoice.
 */
export async function assertInvoiceVoidWithoutPostedPayments(
  paymentRepository: IPaymentRepository,
  rentalInvoiceId: RentalInvoiceId,
): Promise<void> {
  const postedCount =
    await paymentRepository.countPostedPaymentsByRentalInvoiceId(
      rentalInvoiceId,
    );

  if (postedCount === 0) {
    return;
  }

  const postedPayments = await paymentRepository.findPaged({
    page: 1,
    pageSize: Math.min(postedCount, 50),
    rentalInvoiceId,
    status: "POSTED",
  });

  throw new UnprocessableError({
    message:
      "Cannot void rental invoice while POSTED payments exist. Void the payments first.",
    details: {
      rentalInvoiceId,
      postedPaymentCount: postedCount,
      postedPaymentIds: postedPayments.items.map((payment) => payment.id),
    },
  });
}
