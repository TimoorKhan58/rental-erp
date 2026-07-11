import type { PaginationMeta } from "@/types/api";

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

export type PaymentResponse = {
  id: string;
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentStatus;
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentListResponse = {
  items: PaymentResponse[];
  meta: PaginationMeta;
};

export type PaymentSortField =
  | "paymentNumber"
  | "paymentDate"
  | "amount"
  | "status"
  | "createdAt";

export type ListPaymentsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: PaymentSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PaymentStatus;
  customerId?: string;
  rentalInvoiceId?: string;
};

export type CreatePaymentPayload = {
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string | null;
  notes?: string | null;
};

export type UpdatePaymentPayload = {
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  amount?: number;
  referenceNumber?: string | null;
  notes?: string | null;
};
