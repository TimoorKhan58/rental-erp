import type {
  RentalInvoiceLineType,
  RentalInvoiceStatus,
} from "@/modules/rental-invoice/domain/rental-invoice.constants";

export interface RentalInvoiceItemDto {
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

export interface RentalInvoiceDto {
  id: string;
  invoiceNumber: string;
  rentalOrderId: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: RentalInvoiceStatus;
  notes: string | null;
  issuedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  items: RentalInvoiceItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalInvoiceItemDto {
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
  lineTotal?: number;
}

export interface CreateRentalInvoiceDto {
  invoiceNumber: string;
  rentalOrderId: string;
  customerId: string;
  invoiceDate: string;
  dueDate?: string | null;
  notes?: string | null;
  items: CreateRentalInvoiceItemDto[];
}

export interface UpdateRentalInvoiceDto {
  invoiceDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  items?: CreateRentalInvoiceItemDto[];
}
