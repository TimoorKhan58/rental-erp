import { Prisma } from "@/generated/prisma/client";
import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { RentalInvoiceStatus } from "@/modules/rental-invoice/domain/rental-invoice.constants";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
  UpdateRentalInvoiceStatusData,
} from "@/modules/rental-invoice/domain/rental-invoice.types";
import type {
  CustomerId,
  RentalInvoiceId,
  RentalOrderId,
  UserId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toRentalInvoiceDomain(record: {
  id: string;
  invoiceNumber: string;
  rentalOrderId: string;
  customerId: string;
  invoiceDate: Date;
  dueDate: Date | null;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  balance: Prisma.Decimal;
  status: RentalInvoiceStatus;
  notes: string | null;
  issuedAt: Date | null;
  voidedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    lineType: RentalInvoice["items"][number]["lineType"];
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    sortOrder: number;
  }>;
}): RentalInvoice {
  return RentalInvoice.reconstitute({
    id: record.id as RentalInvoiceId,
    invoiceNumber: record.invoiceNumber,
    rentalOrderId: record.rentalOrderId as RentalOrderId,
    customerId: record.customerId as CustomerId,
    invoiceDate: record.invoiceDate,
    dueDate: record.dueDate,
    subtotal: decimalToNumber(record.subtotal),
    discount: decimalToNumber(record.discount),
    tax: decimalToNumber(record.tax),
    grandTotal: decimalToNumber(record.grandTotal),
    paidAmount: decimalToNumber(record.paidAmount),
    balance: decimalToNumber(record.balance),
    status: record.status,
    notes: record.notes,
    issuedAt: record.issuedAt,
    voidedAt: record.voidedAt,
    createdById: record.createdById as UserId,
    items: record.items.map((item) => ({
      id: item.id,
      lineType: item.lineType,
      description: item.description,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      lineTotal: decimalToNumber(item.lineTotal),
      sortOrder: item.sortOrder,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toRentalInvoiceCreateInput(
  data: CreateRentalInvoiceData,
): Prisma.RentalInvoiceCreateInput {
  const normalized = RentalInvoice.create(data);

  return {
    invoiceNumber: normalized.invoiceNumber,
    rentalOrder: { connect: { id: normalized.rentalOrderId } },
    customer: { connect: { id: normalized.customerId } },
    invoiceDate: normalized.invoiceDate,
    dueDate: normalized.dueDate,
    subtotal: toPrismaDecimal(normalized.subtotal),
    discount: toPrismaDecimal(normalized.discount),
    tax: toPrismaDecimal(normalized.tax),
    grandTotal: toPrismaDecimal(normalized.grandTotal),
    paidAmount: toPrismaDecimal(normalized.paidAmount),
    balance: toPrismaDecimal(normalized.balance),
    status: normalized.status,
    notes: normalized.notes,
    createdBy: { connect: { id: normalized.createdById } },
    items: {
      create: normalized.items.map((item) => ({
        lineType: item.lineType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: toPrismaDecimal(item.unitPrice),
        lineTotal: toPrismaDecimal(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    },
  };
}

export function toRentalInvoiceUpdateInput(
  data: UpdateRentalInvoiceData,
  existing: RentalInvoice,
): Prisma.RentalInvoiceUpdateInput {
  const updated = existing.withUpdated(data);
  const props = updated.toProps();
  const update: Prisma.RentalInvoiceUpdateInput = {
    subtotal: toPrismaDecimal(props.subtotal),
    discount: toPrismaDecimal(props.discount),
    tax: toPrismaDecimal(props.tax),
    grandTotal: toPrismaDecimal(props.grandTotal),
    balance: toPrismaDecimal(props.balance),
  };

  if (data.invoiceDate !== undefined) {
    update.invoiceDate = data.invoiceDate;
  }

  if (data.dueDate !== undefined) {
    update.dueDate = data.dueDate;
  }

  if (data.notes !== undefined) {
    update.notes = data.notes;
  }

  if (data.items !== undefined) {
    update.items = {
      deleteMany: {},
      create: props.items.map((item) => ({
        lineType: item.lineType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: toPrismaDecimal(item.unitPrice),
        lineTotal: toPrismaDecimal(item.lineTotal),
        sortOrder: item.sortOrder,
      })),
    };
  }

  return update;
}

export function toRentalInvoiceStatusUpdateInput(
  data: UpdateRentalInvoiceStatusData,
): Prisma.RentalInvoiceUpdateInput {
  const update: Prisma.RentalInvoiceUpdateInput = {
    status: data.status,
  };

  if (data.issuedAt !== undefined) {
    update.issuedAt = data.issuedAt;
  }

  if (data.voidedAt !== undefined) {
    update.voidedAt = data.voidedAt;
  }

  if (data.paidAmount !== undefined) {
    update.paidAmount = toPrismaDecimal(data.paidAmount);
  }

  if (data.balance !== undefined) {
    update.balance = toPrismaDecimal(data.balance);
  }

  return update;
}

export const RENTAL_INVOICE_INCLUDE = {
  items: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
} as const satisfies Prisma.RentalInvoiceInclude;
