import type { NextStep } from "@/components/shared";
import { ROUTES } from "@/config/routes";

import type { ReturnStatus } from "../types";

/** The one thing to do next on a return (usability revamp R3b). */
export function getReturnNextStep(record: { status: ReturnStatus; rentalOrderId: string }): NextStep<"receive" | "inspect" | "complete"> {
  switch (record.status) {
    case "DRAFT":
      return {
        title: "Receive the items",
        text: "When the items arrive at the warehouse, mark them received.",
        tone: "normal",
        action: { kind: "receive", label: "Mark received" },
      };
    case "RECEIVED":
      return {
        title: "Check the items",
        text: "Count and inspect what came back, and note anything damaged or missing.",
        tone: "normal",
        action: { kind: "inspect", label: "Check items" },
      };
    case "INSPECTED":
      return {
        title: "Finish the return",
        text: "Put good items back into stock. Damaged or missing items go on the invoice.",
        tone: "normal",
        action: { kind: "complete", label: "Finish return" },
      };
    case "COMPLETED":
      return {
        title: "Bill the customer",
        text: "The return is done. Create or check the invoice on the order.",
        tone: "done",
        action: { kind: "link", label: "Open order", href: `${ROUTES.rentalOrderDetail(record.rentalOrderId)}#customer-invoice` },
      };
    case "CANCELLED":
    default:
      return { title: "Nothing more to do", text: "This return was cancelled.", tone: "done" };
  }
}
