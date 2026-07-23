import type {
  CustomerId,
  RentalInvoiceId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

import type {
  RentalInvoiceLineType,
  RentalInvoiceStatus,
} from "./rental-invoice.constants";

export interface RentalInvoiceItemProps {
  id: string;
  lineType: RentalInvoiceLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
  productName: string | null;
  dailyRate: number | null;
  numberOfDays: number | null;
  damagedQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  notes: string | null;
}

export interface CreateRentalInvoiceItemData {
  lineType: RentalInvoiceLineType;
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder?: number;
  productName?: string | null;
  dailyRate?: number | null;
  numberOfDays?: number | null;
  damagedQuantity?: number;
  lostQuantity?: number;
  missingQuantity?: number;
  notes?: string | null;
  /** When set, used instead of quantity × unitPrice (product bill rows). */
  lineTotal?: number;
}

export interface CreateRentalInvoiceData {
  invoiceNumber: string;
  rentalOrderId: RentalOrderId;
  customerId: CustomerId;
  invoiceDate: Date;
  dueDate: Date | null;
  notes: string | null;
  items: CreateRentalInvoiceItemData[];
  createdById: UserId;
}

export interface UpdateRentalInvoiceData {
  invoiceDate?: Date;
  dueDate?: Date | null;
  notes?: string | null;
  items?: CreateRentalInvoiceItemData[];
}

export interface RentalInvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
}

export interface UpdateRentalInvoiceStatusData {
  status: RentalInvoiceStatus;
  issuedAt?: Date | null;
  voidedAt?: Date | null;
  paidAmount?: number;
  balance?: number;
}

export interface RentalInvoiceProps {
  id: RentalInvoiceId;
  invoiceNumber: string;
  rentalOrderId: RentalOrderId;
  customerId: CustomerId;
  invoiceDate: Date;
  dueDate: Date | null;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: RentalInvoiceStatus;
  notes: string | null;
  issuedAt: Date | null;
  voidedAt: Date | null;
  createdById: UserId;
  items: RentalInvoiceItemProps[];
  createdAt: Date;
  updatedAt: Date;
}
