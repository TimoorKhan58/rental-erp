import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from "@/modules/payment/domain/payment.constants";

export const SUPPLIER_PAYMENT_MODULE = "supplier-payments";
export const SUPPLIER_PAYMENT_ENTITY_NAME = "SupplierPayment";

export { PAYMENT_METHODS, PAYMENT_STATUSES };
export type { PaymentMethod, PaymentStatus };

export const ELIGIBLE_PURCHASE_ORDER_PAYMENT_STATUSES = [
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
] as const;

export const SUPPLIER_PAYMENT_SEARCH_FIELDS = [
  "paymentNumber",
  "referenceNumber",
  "notes",
] as const;

export const SUPPLIER_PAYMENT_SORT_FIELDS = [
  "paymentNumber",
  "paymentDate",
  "amount",
  "status",
  "createdAt",
] as const;

export type SupplierPaymentSortField =
  (typeof SUPPLIER_PAYMENT_SORT_FIELDS)[number];
