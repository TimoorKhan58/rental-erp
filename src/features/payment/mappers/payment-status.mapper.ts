import type { PaymentMethod, PaymentStatus } from "../types";

export function canEditPayment(status: PaymentStatus): boolean {
  return status === "PENDING";
}

export function canPostPayment(status: PaymentStatus): boolean {
  return status === "PENDING";
}

export function canVoidPayment(status: PaymentStatus): boolean {
  return status === "PENDING" || status === "POSTED";
}

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  POSTED: "Posted",
  VOID: "Void",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};
