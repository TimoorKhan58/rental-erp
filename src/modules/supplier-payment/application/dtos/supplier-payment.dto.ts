import type { PaymentMethod, PaymentStatus } from "@/modules/supplier-payment/domain/supplier-payment.constants";

export interface SupplierPaymentDto {
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
}
