import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { CreateRentalInvoiceData } from "@/modules/rental-invoice/domain/rental-invoice.types";
import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
} from "@/modules/customer/tests/helpers/customer.fixtures";
import { USER_ID } from "@/modules/stock-movement/tests/helpers/stock-movement.fixtures";
import type {
  CustomerId,
  RentalInvoiceId,
  RentalOrderId,
} from "@/shared/domain/ids";

export { CUSTOMER_ID, OTHER_CUSTOMER_ID, USER_ID };

export const RENTAL_INVOICE_ID =
  "bb0e8400-e29b-41d4-a716-446655440000" as RentalInvoiceId;

export const OTHER_RENTAL_INVOICE_ID =
  "bb0e8400-e29b-41d4-a716-446655440001" as RentalInvoiceId;

export const RENTAL_ORDER_ID =
  "cc0e8400-e29b-41d4-a716-446655440000" as RentalOrderId;

export const OTHER_RENTAL_ORDER_ID =
  "cc0e8400-e29b-41d4-a716-446655440001" as RentalOrderId;

export const VALID_INVOICE_ITEMS = [
  {
    lineType: "RENTAL_CHARGE" as const,
    description: "Tent rental - 3 days",
    quantity: 3,
    unitPrice: 100,
  },
  {
    lineType: "DELIVERY_CHARGE" as const,
    description: "Delivery fee",
    quantity: 1,
    unitPrice: 50,
  },
];

export const VALID_CREATE_INPUT = {
  invoiceNumber: "INV-2026-001",
  rentalOrderId: RENTAL_ORDER_ID,
  customerId: CUSTOMER_ID,
  invoiceDate: "2026-02-15T00:00:00.000Z",
  dueDate: "2026-03-15T00:00:00.000Z",
  notes: "Rental invoice for completed order",
  items: VALID_INVOICE_ITEMS,
};

export function buildCreateRentalInvoiceData(
  override: Partial<CreateRentalInvoiceData> = {},
): CreateRentalInvoiceData {
  return {
    invoiceNumber: VALID_CREATE_INPUT.invoiceNumber,
    rentalOrderId: RENTAL_ORDER_ID,
    customerId: CUSTOMER_ID,
    invoiceDate: new Date(VALID_CREATE_INPUT.invoiceDate),
    dueDate: new Date(VALID_CREATE_INPUT.dueDate),
    notes: VALID_CREATE_INPUT.notes,
    items: VALID_INVOICE_ITEMS.map((item) => ({ ...item })),
    createdById: USER_ID,
    ...override,
  };
}

function withPersistedItemIds(
  items: ReturnType<typeof RentalInvoice.create>["items"],
): ReturnType<typeof RentalInvoice.create>["items"] {
  return items.map((item, index) => ({
    ...item,
    id: `item-${index + 1}`,
  }));
}

export function buildRentalInvoiceEntity(
  override: {
    id?: RentalInvoiceId;
    status?: RentalInvoice["status"];
    paidAmount?: number;
    notes?: string | null;
    customerId?: CustomerId;
    rentalOrderId?: RentalOrderId;
    issuedAt?: Date | null;
    voidedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): RentalInvoice {
  const created = RentalInvoice.create(buildCreateRentalInvoiceData());
  const now = new Date("2026-01-15T10:00:00.000Z");
  const items = withPersistedItemIds(created.items);
  const totals =
    override.paidAmount !== undefined
      ? {
          ...created,
          paidAmount: override.paidAmount,
          balance: created.grandTotal - override.paidAmount,
        }
      : created;

  return RentalInvoice.reconstitute({
    id: override.id ?? RENTAL_INVOICE_ID,
    invoiceNumber: created.invoiceNumber,
    rentalOrderId: override.rentalOrderId ?? created.rentalOrderId,
    customerId: override.customerId ?? created.customerId,
    invoiceDate: created.invoiceDate,
    dueDate: created.dueDate,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    grandTotal: totals.grandTotal,
    paidAmount: override.paidAmount ?? totals.paidAmount,
    balance: override.paidAmount !== undefined ? totals.balance : totals.balance,
    status: override.status ?? "DRAFT",
    notes: override.notes !== undefined ? override.notes : created.notes,
    issuedAt: override.issuedAt ?? null,
    voidedAt: override.voidedAt ?? null,
    createdById: created.createdById,
    items,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildIssuedRentalInvoiceEntity(): RentalInvoice {
  const draft = buildRentalInvoiceEntity();
  const now = new Date("2026-01-18T10:00:00.000Z");

  return RentalInvoice.reconstitute({
    ...draft.toProps(),
    status: "ISSUED",
    issuedAt: now,
    updatedAt: now,
  });
}

export function buildPartiallyPaidRentalInvoiceEntity(
  paidAmount = 100,
): RentalInvoice {
  const issued = buildIssuedRentalInvoiceEntity();

  return issued.withPaymentApplied(paidAmount);
}

export function buildPaidRentalInvoiceEntity(): RentalInvoice {
  const issued = buildIssuedRentalInvoiceEntity();

  return issued.withPaymentApplied(issued.grandTotal);
}

export function buildVoidRentalInvoiceEntity(): RentalInvoice {
  const issued = buildIssuedRentalInvoiceEntity();
  const now = new Date("2026-01-20T10:00:00.000Z");

  return RentalInvoice.reconstitute({
    ...issued.withVoided().toProps(),
    voidedAt: now,
    updatedAt: now,
  });
}
