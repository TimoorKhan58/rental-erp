import type { RentalInvoiceLineType } from "./rental-invoice.constants";
import { RentalInvoiceInvariantError } from "./rental-invoice.errors";
import { computeLineTotalAmount } from "./rental-invoice.rules";
import type { RentalInvoiceItemProps } from "./rental-invoice.types";

export class RentalInvoiceItem {
  readonly id: string;
  readonly lineType: RentalInvoiceLineType;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly sortOrder: number;
  readonly productName: string | null;
  readonly dailyRate: number | null;
  readonly numberOfDays: number | null;
  readonly damagedQuantity: number;
  readonly lostQuantity: number;
  readonly missingQuantity: number;
  readonly notes: string | null;

  private constructor(props: RentalInvoiceItemProps) {
    this.id = props.id;
    this.lineType = props.lineType;
    this.description = props.description;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.lineTotal = props.lineTotal;
    this.sortOrder = props.sortOrder;
    this.productName = props.productName;
    this.dailyRate = props.dailyRate;
    this.numberOfDays = props.numberOfDays;
    this.damagedQuantity = props.damagedQuantity;
    this.lostQuantity = props.lostQuantity;
    this.missingQuantity = props.missingQuantity;
    this.notes = props.notes;
  }

  static create(
    props: Omit<RentalInvoiceItemProps, "id" | "lineTotal"> & {
      lineTotal?: number;
    },
  ): RentalInvoiceItemProps {
    if (props.quantity <= 0) {
      throw new RentalInvoiceInvariantError(
        "Item quantity must be greater than zero",
        "quantity",
      );
    }

    if (props.unitPrice < 0) {
      throw new RentalInvoiceInvariantError(
        "Item unit price must be zero or greater",
        "unitPrice",
      );
    }

    const description = props.description.trim();

    if (description.length === 0) {
      throw new RentalInvoiceInvariantError(
        "Item description is required",
        "description",
      );
    }

    const lineTotal =
      props.lineTotal !== undefined
        ? props.lineTotal
        : computeLineTotalAmount(props.quantity, props.unitPrice);

    if (lineTotal < 0) {
      throw new RentalInvoiceInvariantError(
        "Item line total must be zero or greater",
        "lineTotal",
      );
    }

    return {
      id: "",
      lineType: props.lineType,
      description,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      lineTotal,
      sortOrder: props.sortOrder,
      productName: props.productName?.trim() ? props.productName.trim() : null,
      dailyRate: props.dailyRate ?? null,
      numberOfDays: props.numberOfDays ?? null,
      damagedQuantity: props.damagedQuantity ?? 0,
      lostQuantity: props.lostQuantity ?? 0,
      missingQuantity: props.missingQuantity ?? 0,
      notes: props.notes?.trim() ? props.notes.trim() : null,
    };
  }

  static reconstitute(props: RentalInvoiceItemProps): RentalInvoiceItem {
    return new RentalInvoiceItem(props);
  }

  toProps(): RentalInvoiceItemProps {
    return {
      id: this.id,
      lineType: this.lineType,
      description: this.description,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      lineTotal: this.lineTotal,
      sortOrder: this.sortOrder,
      productName: this.productName,
      dailyRate: this.dailyRate,
      numberOfDays: this.numberOfDays,
      damagedQuantity: this.damagedQuantity,
      lostQuantity: this.lostQuantity,
      missingQuantity: this.missingQuantity,
      notes: this.notes,
    };
  }
}
