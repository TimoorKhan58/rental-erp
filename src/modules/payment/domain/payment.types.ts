import type {
  CustomerId,
  PaymentId,
  RentalInvoiceId,
  UserId,
} from "@/shared/domain/ids";

import type { PaymentMethod, PaymentStatus } from "./payment.constants";

export interface CreatePaymentData {
  paymentNumber: string;
  rentalInvoiceId: RentalInvoiceId;
  customerId: CustomerId;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  createdById: UserId;
}

export interface UpdatePaymentData {
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  amount?: number;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentStatusData {
  status: PaymentStatus;
  postedAt?: Date | null;
  voidedAt?: Date | null;
}

export interface PaymentProps {
  id: PaymentId;
  paymentNumber: string;
  rentalInvoiceId: RentalInvoiceId;
  customerId: CustomerId;
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
