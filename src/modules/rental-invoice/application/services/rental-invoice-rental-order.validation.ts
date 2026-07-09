import type { Customer } from "@/modules/customer/domain/customer.entity";
import type { RentalOrderInvoiceLookupResult } from "@/modules/rental-invoice/domain";
import {
  assertCustomerMatchesRentalOrder,
  assertRentalOrderEligibleForInvoice,
  RentalInvoiceEligibilityError,
} from "@/modules/rental-invoice/domain";
import { UnprocessableError } from "@/shared/infrastructure/errors";

export function validateRentalOrderForInvoice(
  rentalOrder: RentalOrderInvoiceLookupResult,
  customerId: string,
): void {
  try {
    assertRentalOrderEligibleForInvoice(rentalOrder.status);
    assertCustomerMatchesRentalOrder(customerId, rentalOrder.customerId);
  } catch (error) {
    if (error instanceof RentalInvoiceEligibilityError) {
      throw new UnprocessableError({
        message: error.message,
      });
    }

    throw error;
  }
}

export function validateCustomerForInvoice(customer: Customer | null): void {
  if (customer === null) {
    throw new UnprocessableError({
      message: "Customer not found",
    });
  }

  if (!customer.isActive) {
    throw new UnprocessableError({
      message: "Customer is not active",
    });
  }
}
