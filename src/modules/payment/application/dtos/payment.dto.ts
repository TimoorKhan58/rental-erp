import type { PaymentMethod, PaymentStatus } from "@/modules/payment/domain/payment.constants";

export interface PaymentDto {
  id: string;
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  isRefund: boolean;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentStatus;
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  isRefund?: boolean;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentDto {
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  amount?: number;
  referenceNumber?: string | null;
  notes?: string | null;
}
