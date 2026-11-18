import type { NextStep } from "@/components/shared";

import type { PaymentStatus } from "../types";

/** The one thing to do next on a payment (usability revamp R3b). */
export function getPaymentNextStep(payment: { status: PaymentStatus }): NextStep<"post"> {
  switch (payment.status) {
    case "PENDING":
      return {
        title: "Post the payment",
        text: "Check the amount and method, then post it so the invoice balance goes down.",
        tone: "normal",
        action: { kind: "post", label: "Post payment" },
      };
    case "POSTED":
      return { title: "All done", text: "This payment is counted against the invoice.", tone: "done" };
    case "VOID":
    default:
      return { title: "Nothing more to do", text: "This payment was voided.", tone: "done" };
  }
}
