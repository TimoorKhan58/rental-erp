import type { NextStep } from "@/components/shared";
import { ROUTES } from "@/config/routes";

import type { DispatchStatus } from "../types";

/** The one thing to do next on a dispatch (usability revamp R3b). */
export function getDispatchNextStep(dispatch: { status: DispatchStatus; rentalOrderId: string }): NextStep<"ready" | "complete"> {
  switch (dispatch.status) {
    case "DRAFT":
      return {
        title: "Get the items ready",
        text: "Pack and check the items, then mark the dispatch ready to go.",
        tone: "normal",
        action: { kind: "ready", label: "Mark ready" },
      };
    case "READY":
      return {
        title: "Send it out",
        text: "Once the items have left with the customer or driver, mark them as sent.",
        tone: "normal",
        action: { kind: "complete", label: "Mark as sent" },
      };
    case "DISPATCHED":
    case "COMPLETED":
      return {
        title: "Items are with the customer",
        text: "Record a return on the order when the items come back.",
        tone: "done",
        action: { kind: "link", label: "Receive back", href: `${ROUTES.returnsNew}?rentalOrderId=${dispatch.rentalOrderId}` },
      };
    case "CANCELLED":
    default:
      return { title: "Nothing more to do", text: "This dispatch was cancelled.", tone: "done" };
  }
}
