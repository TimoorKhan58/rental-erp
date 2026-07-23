import type {
  PaymentStatusFilter,
  RentalInvoiceLineType,
  RentalInvoiceStatus,
} from "../types";

export function canVoidRentalInvoice(status: RentalInvoiceStatus): boolean {
  return status === "DRAFT" || status === "ISSUED" || status === "PARTIALLY_PAID";
}

export function canIssueRentalInvoice(status: RentalInvoiceStatus): boolean {
  return status === "DRAFT";
}

export const STATUS_LABELS: Record<RentalInvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  VOID: "Void",
};

export const LINE_TYPE_LABELS: Record<RentalInvoiceLineType, string> = {
  RENTAL_CHARGE: "Rental charge",
  DELIVERY_CHARGE: "Delivery charge",
  PICKUP_CHARGE: "Pickup charge",
  DAMAGE_CHARGE: "Damage charge",
  LOST_ITEM_CHARGE: "Lost item charge",
  REPAIR_CHARGE: "Repair charge",
  LABOUR_CHARGE: "Labour charge",
  MANUAL_CHARGE: "Manual charge",
  DISCOUNT: "Discount",
  TAX: "Tax",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusFilter, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  void: "Void",
};

export function getPaymentStatusLabel(invoice: {
  status: RentalInvoiceStatus;
  balance: number;
  paidAmount: number;
}): string {
  if (invoice.status === "VOID") {
    return PAYMENT_STATUS_LABELS.void;
  }

  if (invoice.status === "PAID" || invoice.balance <= 0) {
    return PAYMENT_STATUS_LABELS.paid;
  }

  if (invoice.status === "PARTIALLY_PAID" || invoice.paidAmount > 0) {
    return PAYMENT_STATUS_LABELS.partial;
  }

  return PAYMENT_STATUS_LABELS.unpaid;
}

export function matchesPaymentStatusFilter(
  invoice: {
    status: RentalInvoiceStatus;
    balance: number;
    paidAmount: number;
  },
  filter?: PaymentStatusFilter,
): boolean {
  if (!filter) {
    return true;
  }

  if (filter === "void") {
    return invoice.status === "VOID";
  }

  if (filter === "paid") {
    return invoice.status === "PAID" || (invoice.status !== "VOID" && invoice.balance <= 0);
  }

  if (filter === "partial") {
    return (
      invoice.status === "PARTIALLY_PAID" ||
      (invoice.paidAmount > 0 && invoice.balance > 0 && invoice.status !== "VOID")
    );
  }

  return (
    invoice.status === "ISSUED" ||
    (invoice.status === "DRAFT" && invoice.paidAmount === 0)
  );
}
