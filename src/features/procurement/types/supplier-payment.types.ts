import type { PaginationMeta } from "@/types/api";
import type { PaymentMethod, PaymentStatus } from "@/features/payment/types";

export type { PaymentMethod, PaymentStatus };

export type SupplierPaymentResponse = {
  id: string;
  paymentNumber: string;
  purchaseOrderId: string;
  supplierId: string;
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

export type SupplierPaymentListResponse = {
  items: SupplierPaymentResponse[];
  meta: PaginationMeta;
};

export type ListSupplierPaymentsParams = {
  page?: number;
  pageSize?: number;
  sortBy?: "paymentNumber" | "paymentDate" | "amount" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PaymentStatus;
  supplierId?: string;
  purchaseOrderId?: string;
};

export type CreateSupplierPaymentPayload = {
  paymentNumber?: string;
  purchaseOrderId: string;
  supplierId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string | null;
  notes?: string | null;
};
