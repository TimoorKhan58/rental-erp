import type { RentalInvoiceStatus } from "./rental-invoice.constants";
import { ELIGIBLE_RENTAL_ORDER_INVOICE_STATUS } from "./rental-invoice.constants";
import {
  RentalInvoiceEligibilityError,
  RentalInvoiceInvalidStatusError,
  RentalInvoiceInvariantError,
  createInvoiceNumber,
} from "./rental-invoice.errors";
import { RentalInvoiceItem } from "./rental-invoice-item.entity";
import type {
  CreateRentalInvoiceData,
  CreateRentalInvoiceItemData,
  RentalInvoiceItemProps,
  RentalInvoiceProps,
  RentalInvoiceTotals,
} from "./rental-invoice.types";

export function computeLineTotalAmount(
  quantity: number,
  unitPrice: number,
): number {
  return quantity * unitPrice;
}

export function validateRentalInvoiceItems(
  items: CreateRentalInvoiceItemData[],
): RentalInvoiceItemProps[] {
  if (items.length === 0) {
    throw new RentalInvoiceInvariantError(
      "Rental invoice must have at least one item",
      "items",
    );
  }

  return items.map((item, index) => {
    try {
      return RentalInvoiceItem.create({
        lineType: item.lineType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder ?? index,
        productName: item.productName ?? null,
        dailyRate: item.dailyRate ?? null,
        numberOfDays: item.numberOfDays ?? null,
        damagedQuantity: item.damagedQuantity ?? 0,
        lostQuantity: item.lostQuantity ?? 0,
        missingQuantity: item.missingQuantity ?? 0,
        notes: item.notes ?? null,
        lineTotal: item.lineTotal,
      });
    } catch (error) {
      if (error instanceof RentalInvoiceInvariantError) {
        throw new RentalInvoiceInvariantError(
          error.message,
          error.field ? `items[${index}].${error.field}` : `items[${index}]`,
        );
      }

      throw error;
    }
  });
}

export function computeInvoiceTotals(
  items: RentalInvoiceItemProps[],
  paidAmount = 0,
): RentalInvoiceTotals {
  if (paidAmount < 0) {
    throw new RentalInvoiceInvariantError(
      "Paid amount must be zero or greater",
      "paidAmount",
    );
  }

  let subtotal = 0;
  let discount = 0;
  let tax = 0;

  for (const item of items) {
    if (item.lineType === "DISCOUNT") {
      discount += item.lineTotal;
      continue;
    }

    if (item.lineType === "TAX") {
      tax += item.lineTotal;
      continue;
    }

    subtotal += item.lineTotal;
  }

  const grandTotal = roundMoney(subtotal - discount + tax);

  if (grandTotal < 0) {
    throw new RentalInvoiceInvariantError(
      "Grand total cannot be negative",
      "grandTotal",
    );
  }

  const normalizedPaidAmount = roundMoney(paidAmount);
  const balance = roundMoney(grandTotal - normalizedPaidAmount);

  return {
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    tax: roundMoney(tax),
    grandTotal,
    paidAmount: normalizedPaidAmount,
    balance,
  };
}

export function assertRentalOrderEligibleForInvoice(status: string): void {
  if (status !== ELIGIBLE_RENTAL_ORDER_INVOICE_STATUS) {
    throw new RentalInvoiceEligibilityError(
      `Rental order must be COMPLETED to create invoice (current: ${status})`,
    );
  }
}

export function assertCustomerMatchesRentalOrder(
  invoiceCustomerId: string,
  rentalOrderCustomerId: string,
): void {
  if (invoiceCustomerId !== rentalOrderCustomerId) {
    throw new RentalInvoiceEligibilityError(
      "Customer does not match rental order customer",
    );
  }
}

export function assertCanUpdate(status: RentalInvoiceStatus): void {
  if (status !== "DRAFT") {
    throw new RentalInvoiceInvalidStatusError(status, "update");
  }
}

export function assertCanIssue(status: RentalInvoiceStatus): void {
  if (status !== "DRAFT") {
    throw new RentalInvoiceInvalidStatusError(status, "issue");
  }
}

export function assertCanVoid(status: RentalInvoiceStatus): void {
  if (status === "PAID" || status === "VOID") {
    throw new RentalInvoiceInvalidStatusError(status, "void");
  }
}

export function assertImmutablePaidInvoice(status: RentalInvoiceStatus): void {
  if (status === "PAID") {
    throw new RentalInvoiceInvalidStatusError(status, "modify");
  }
}

export function normalizeCreateRentalInvoiceData(
  data: CreateRentalInvoiceData,
): Omit<
  RentalInvoiceProps,
  "id" | "status" | "issuedAt" | "voidedAt" | "createdAt" | "updatedAt"
> {
  const items = validateRentalInvoiceItems(data.items);
  const totals = computeInvoiceTotals(items, 0);

  return {
    invoiceNumber: createInvoiceNumber(data.invoiceNumber),
    rentalOrderId: data.rentalOrderId,
    customerId: data.customerId,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    notes: normalizeOptionalText(data.notes),
    items,
    createdById: data.createdById,
    ...totals,
  };
}

export function normalizeRentalInvoiceProps(
  props: RentalInvoiceProps,
): RentalInvoiceProps {
  const items = props.items.map((item) => ({
    ...item,
    productName: item.productName ?? null,
    dailyRate: item.dailyRate ?? null,
    numberOfDays: item.numberOfDays ?? null,
    damagedQuantity: item.damagedQuantity ?? 0,
    lostQuantity: item.lostQuantity ?? 0,
    missingQuantity: item.missingQuantity ?? 0,
    notes: normalizeOptionalText(item.notes),
    // Preserve stored line totals (product rows include days + damage/loss).
    lineTotal: item.lineTotal,
  }));
  const totals = computeInvoiceTotals(items, props.paidAmount);

  return {
    ...props,
    invoiceNumber: createInvoiceNumber(props.invoiceNumber),
    notes: normalizeOptionalText(props.notes),
    items,
    ...totals,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
