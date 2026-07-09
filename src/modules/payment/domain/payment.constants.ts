export const PAYMENT_MODULE = "payments";
export const PAYMENT_ENTITY_NAME = "Payment";

export const PAYMENT_STATUSES = ["PENDING", "POSTED", "VOID"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "CARD",
  "ONLINE",
  "OTHER",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ELIGIBLE_INVOICE_PAYMENT_STATUSES = [
  "ISSUED",
  "PARTIALLY_PAID",
] as const;

export const PAYMENT_SEARCH_FIELDS = [
  "paymentNumber",
  "referenceNumber",
  "notes",
] as const;

export const PAYMENT_SORT_FIELDS = [
  "paymentNumber",
  "paymentDate",
  "amount",
  "status",
  "createdAt",
] as const;

export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];
