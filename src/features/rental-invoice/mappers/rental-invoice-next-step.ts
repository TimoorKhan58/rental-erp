import type { NextStep } from "@/components/shared";
import { ROUTES } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";

import type { RentalInvoiceStatus } from "../types";

/** The one thing to do next on an invoice (usability revamp R3b). */
export function getRentalInvoiceNextStep(
  invoice: { id: string; customerId: string; status: RentalInvoiceStatus; balance: number; dueDate?: string | null },
  today: string,
): NextStep<"issue"> {
  switch (invoice.status) {
    case "DRAFT":
      return {
        title: "Check and issue the invoice",
        text: "Add any extra charges, then issue it so the customer can pay.",
        tone: "normal",
        action: { kind: "issue", label: "Issue invoice" },
      };
    case "ISSUED":
    case "PARTIALLY_PAID": {
      if (invoice.balance <= 0) break;
      const overdue = Boolean(invoice.dueDate) && invoice.dueDate!.slice(0, 10) < today;
      return {
        title: `${formatCurrency(invoice.balance)} still to collect`,
        text: overdue
          ? "The due date has passed. Follow up with the customer and record what they pay."
          : "Record each payment as the customer pays.",
        tone: overdue ? "urgent" : "normal",
        action: { kind: "link", label: "Receive a payment", href: ROUTES.paymentNewForInvoice(invoice.id, invoice.customerId) },
      };
    }
    case "VOID":
      return { title: "Nothing more to do", text: "This invoice was voided.", tone: "done" };
  }
  return { title: "Paid in full", text: "Nothing is left to collect on this invoice.", tone: "done" };
}
