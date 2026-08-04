import type {
  PurchaseOrderId,
  SupplierId,
  SupplierPaymentId,
  UserId,
} from "@/shared/domain/ids";

import type { PaymentMethod, PaymentStatus } from "./supplier-payment.constants";

export interface CreateSupplierPaymentData {
  paymentNumber: string;
  purchaseOrderId: PurchaseOrderId;
  supplierId: SupplierId;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  createdById: UserId;
}

export interface UpdateSupplierPaymentStatusData {
  status: PaymentStatus;
  postedAt?: Date | null;
  voidedAt?: Date | null;
}

export interface SupplierPaymentProps {
  id: SupplierPaymentId;
  paymentNumber: string;
  purchaseOrderId: PurchaseOrderId;
  supplierId: SupplierId;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentStatus;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
}
