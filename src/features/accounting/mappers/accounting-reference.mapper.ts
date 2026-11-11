import { ROUTES } from "@/config/routes";

import type { JournalReferenceType } from "../types";

export function getJournalReferenceHref(
  referenceType: JournalReferenceType | null,
  referenceId: string | null,
): string | null {
  if (referenceType === null || referenceId === null || referenceId.trim() === "") {
    return null;
  }

  switch (referenceType) {
    case "RENTAL_INVOICE":
      return ROUTES.rentalInvoiceDetail(referenceId);
    case "PAYMENT":
      return ROUTES.paymentDetail(referenceId);
    case "OTHER":
      return ROUTES.expenseDetail(referenceId);
    default:
      return null;
  }
}

export function getJournalReferenceLabel(
  referenceType: JournalReferenceType | null,
  referenceId: string | null,
): string {
  if (referenceType === null || referenceId === null || referenceId.trim() === "") {
    return "—";
  }

  return referenceId;
}
