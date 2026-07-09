import type { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
} from "@/modules/rental-invoice/domain/rental-invoice.types";
import type {
  CustomerId,
  RentalInvoiceId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import type {
  CreateRentalInvoiceInput,
  UpdateRentalInvoiceInput,
} from "../schemas/rental-invoice.schemas";
import type { ListRentalInvoicesInput } from "../schemas/list-rental-invoices.schema";

export function toRentalInvoiceDto(invoice: RentalInvoice): RentalInvoiceDto {
  const props = invoice.toProps();

  return {
    id: props.id,
    invoiceNumber: props.invoiceNumber,
    rentalOrderId: props.rentalOrderId,
    customerId: props.customerId,
    invoiceDate: props.invoiceDate.toISOString(),
    dueDate: props.dueDate?.toISOString() ?? null,
    subtotal: props.subtotal,
    discount: props.discount,
    tax: props.tax,
    grandTotal: props.grandTotal,
    paidAmount: props.paidAmount,
    balance: props.balance,
    status: props.status,
    notes: props.notes,
    issuedAt: props.issuedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
    createdById: props.createdById,
    items: props.items.map((item) => ({
      id: item.id,
      lineType: item.lineType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      sortOrder: item.sortOrder,
    })),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateRentalInvoiceData(
  input: CreateRentalInvoiceInput,
  createdById: UserId,
): CreateRentalInvoiceData {
  return {
    invoiceNumber: input.invoiceNumber,
    rentalOrderId: input.rentalOrderId as RentalOrderId,
    customerId: input.customerId as CustomerId,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    items: input.items.map((item, index) => ({
      lineType: item.lineType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: item.sortOrder ?? index,
    })),
    createdById,
  };
}

export function toUpdateRentalInvoiceData(
  input: UpdateRentalInvoiceInput,
): UpdateRentalInvoiceData {
  return {
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    notes: input.notes,
    items: input.items?.map((item, index) => ({
      lineType: item.lineType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: item.sortOrder ?? index,
    })),
  };
}

export function toRentalInvoiceId(id: string): RentalInvoiceId {
  return id as RentalInvoiceId;
}

export function toRentalOrderId(id: string): RentalOrderId {
  return id as RentalOrderId;
}

export function toCustomerId(id: string): CustomerId {
  return id as CustomerId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toRentalInvoiceListQuery(
  input: ListRentalInvoicesInput,
): RentalInvoiceListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    customerId: input.customerId as CustomerId | undefined,
    rentalOrderId: input.rentalOrderId as RentalOrderId | undefined,
  };
}
