import { STATUS_LABELS as RENTAL_ORDER_STATUS_LABELS } from "@/features/rental-order/mappers";
import type { RentalOrderStatus } from "@/features/rental-order/types";
import {
  getInvoiceAmountRemainderLabel,
  getPaymentStatusLabel,
  STATUS_LABELS as INVOICE_STATUS_LABELS,
} from "./rental-invoice-status.mapper";
import type { RentalInvoiceResponse } from "../types";

/** Presentation-only billing context for a rental order hub section. */
export type RentalOrderBillingPresentationState =
  | "cancelled"
  | "no_invoice_pending_completion"
  | "no_invoice_ready"
  | "no_invoice_no_permission"
  | "invoice_exists";

export type RentalOrderBillingPresentation = {
  state: RentalOrderBillingPresentationState;
  /** Short label for status row (e.g. hero or section header). */
  statusLabel: string;
  /** One or two sentences; matches domain gates, not speculative rules. */
  statusDescription: string;
  /** Operator-facing next step when generation is blocked or available. */
  nextStep: string | null;
  /** Whether Generate invoice should appear (UI gate only; server remains authoritative). */
  showGenerateAction: boolean;
};

const ELIGIBLE_ORDER_STATUS: RentalOrderStatus = "COMPLETED";

type DeriveRentalOrderBillingInput = {
  rentalOrderStatus: RentalOrderStatus;
  /** Parent-controlled generate gate (e.g. order COMPLETED or return COMPLETED on return detail). */
  canGenerate: boolean;
  canCreate: boolean;
  activeInvoice: RentalInvoiceResponse | undefined;
};

export function deriveRentalOrderBillingPresentation(
  input: DeriveRentalOrderBillingInput,
): RentalOrderBillingPresentation {
  const { rentalOrderStatus, canGenerate, canCreate, activeInvoice } = input;

  if (rentalOrderStatus === "CANCELLED") {
    return {
      state: "cancelled",
      statusLabel: "Not billable",
      statusDescription: "This rental order was cancelled. Customer invoices are not created for cancelled orders.",
      nextStep: null,
      showGenerateAction: false,
    };
  }

  if (activeInvoice) {
    const issueLabel = INVOICE_STATUS_LABELS[activeInvoice.status];
    const collectionLabel = getPaymentStatusLabel({
      status: activeInvoice.status,
      balance: activeInvoice.balance,
      paidAmount: activeInvoice.paidAmount,
    });
    const remainder = getInvoiceAmountRemainderLabel(activeInvoice);

    return {
      state: "invoice_exists",
      statusLabel: `${issueLabel} · ${collectionLabel}`,
      statusDescription: `Invoice ${activeInvoice.invoiceNumber} is linked to this rental. ${remainder}.`,
      nextStep:
        activeInvoice.status === "DRAFT"
          ? "Open the invoice to review charges, then issue it when ready."
          : activeInvoice.balance > 0 && activeInvoice.status !== "VOID"
            ? "Open the invoice to record payment or review the balance."
            : null,
      showGenerateAction: false,
    };
  }

  if (canGenerate && canCreate) {
    return {
      state: "no_invoice_ready",
      statusLabel: "Ready to generate",
      statusDescription:
        "No active invoice on this rental yet. Generate a draft bill with rental charges and any damage, loss, or missing lines from completed returns.",
      nextStep: "Use Generate invoice to create a draft customer invoice.",
      showGenerateAction: true,
    };
  }

  if (canGenerate && !canCreate) {
    return {
      state: "no_invoice_no_permission",
      statusLabel: "Ready to generate",
      statusDescription:
        "This rental is eligible for billing, but your account cannot create invoices.",
      nextStep: "Ask someone with invoice creation permission to generate the bill.",
      showGenerateAction: false,
    };
  }

  const orderLabel =
    RENTAL_ORDER_STATUS_LABELS[rentalOrderStatus] ?? rentalOrderStatus;

  if (rentalOrderStatus !== ELIGIBLE_ORDER_STATUS) {
    return {
      state: "no_invoice_pending_completion",
      statusLabel: "No invoice yet",
      statusDescription: `Invoice generation is available when the rental order is Completed (currently ${orderLabel}). Finish returns and operational steps so the order can reach Completed — the server enforces this on generate.`,
      nextStep:
        "Complete dispatches and returns as needed. When the order status is Completed, Generate invoice will appear here.",
      showGenerateAction: false,
    };
  }

  return {
    state: "no_invoice_no_permission",
    statusLabel: "No invoice yet",
    statusDescription:
      "This rental order is Completed but invoice generation is not available from this screen.",
    nextStep: null,
    showGenerateAction: false,
  };
}
