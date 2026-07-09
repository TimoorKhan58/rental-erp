import type { RentalInvoiceId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { RentalInvoiceStatus } from "./rental-invoice.constants";
import { RentalInvoiceInvalidStatusError } from "./rental-invoice.errors";
import {
  assertCanIssue,
  assertCanUpdate,
  assertCanVoid,
  assertImmutablePaidInvoice,
  computeInvoiceTotals,
  normalizeCreateRentalInvoiceData,
  normalizeRentalInvoiceProps,
  validateRentalInvoiceItems,
} from "./rental-invoice.rules";
import type {
  CreateRentalInvoiceData,
  RentalInvoiceItemProps,
  RentalInvoiceProps,
  UpdateRentalInvoiceData,
} from "./rental-invoice.types";

export class RentalInvoice implements Entity<RentalInvoiceId> {
  readonly id: RentalInvoiceId;
  readonly invoiceNumber: string;
  readonly rentalOrderId: RentalInvoiceProps["rentalOrderId"];
  readonly customerId: RentalInvoiceProps["customerId"];
  readonly invoiceDate: Date;
  readonly dueDate: Date | null;
  readonly subtotal: number;
  readonly discount: number;
  readonly tax: number;
  readonly grandTotal: number;
  readonly paidAmount: number;
  readonly balance: number;
  readonly status: RentalInvoiceStatus;
  readonly notes: string | null;
  readonly issuedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly createdById: RentalInvoiceProps["createdById"];
  readonly items: RentalInvoiceItemProps[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RentalInvoiceProps) {
    const normalized = normalizeRentalInvoiceProps(props);

    this.id = normalized.id;
    this.invoiceNumber = normalized.invoiceNumber;
    this.rentalOrderId = normalized.rentalOrderId;
    this.customerId = normalized.customerId;
    this.invoiceDate = normalized.invoiceDate;
    this.dueDate = normalized.dueDate;
    this.subtotal = normalized.subtotal;
    this.discount = normalized.discount;
    this.tax = normalized.tax;
    this.grandTotal = normalized.grandTotal;
    this.paidAmount = normalized.paidAmount;
    this.balance = normalized.balance;
    this.status = normalized.status;
    this.notes = normalized.notes;
    this.issuedAt = normalized.issuedAt;
    this.voidedAt = normalized.voidedAt;
    this.createdById = normalized.createdById;
    this.items = normalized.items;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateRentalInvoiceData,
  ): Omit<RentalInvoiceProps, "id" | "createdAt" | "updatedAt"> {
    const normalized = normalizeCreateRentalInvoiceData(data);

    return {
      ...normalized,
      status: "DRAFT",
      issuedAt: null,
      voidedAt: null,
    };
  }

  static reconstitute(props: RentalInvoiceProps): RentalInvoice {
    return new RentalInvoice(props);
  }

  toProps(): RentalInvoiceProps {
    return {
      id: this.id,
      invoiceNumber: this.invoiceNumber,
      rentalOrderId: this.rentalOrderId,
      customerId: this.customerId,
      invoiceDate: this.invoiceDate,
      dueDate: this.dueDate,
      subtotal: this.subtotal,
      discount: this.discount,
      tax: this.tax,
      grandTotal: this.grandTotal,
      paidAmount: this.paidAmount,
      balance: this.balance,
      status: this.status,
      notes: this.notes,
      issuedAt: this.issuedAt,
      voidedAt: this.voidedAt,
      createdById: this.createdById,
      items: this.items.map((item) => ({ ...item })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withUpdated(data: UpdateRentalInvoiceData): RentalInvoice {
    assertCanUpdate(this.status);

    const items =
      data.items !== undefined
        ? validateRentalInvoiceItems(data.items)
        : this.items;
    const totals = computeInvoiceTotals(items, this.paidAmount);

    return RentalInvoice.reconstitute({
      ...this.toProps(),
      invoiceDate: data.invoiceDate ?? this.invoiceDate,
      dueDate: data.dueDate !== undefined ? data.dueDate : this.dueDate,
      notes: data.notes !== undefined ? data.notes : this.notes,
      items,
      ...totals,
      updatedAt: new Date(),
    });
  }

  withIssued(): RentalInvoice {
    assertCanIssue(this.status);

    return RentalInvoice.reconstitute({
      ...this.toProps(),
      status: "ISSUED",
      issuedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  withVoided(): RentalInvoice {
    assertCanVoid(this.status);
    assertImmutablePaidInvoice(this.status);

    return RentalInvoice.reconstitute({
      ...this.toProps(),
      status: "VOID",
      voidedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  withPaymentApplied(paidAmount: number): RentalInvoice {
    if (this.status === "VOID" || this.status === "DRAFT") {
      throw new RentalInvoiceInvalidStatusError(this.status, "apply payment");
    }

    const totals = computeInvoiceTotals(this.items, paidAmount);
    let status: RentalInvoiceStatus = this.status;

    if (totals.paidAmount <= 0) {
      status = this.status === "PARTIALLY_PAID" ? "ISSUED" : this.status;
    } else if (totals.balance <= 0) {
      status = "PAID";
    } else {
      status = "PARTIALLY_PAID";
    }

    return RentalInvoice.reconstitute({
      ...this.toProps(),
      ...totals,
      status,
      updatedAt: new Date(),
    });
  }
}
