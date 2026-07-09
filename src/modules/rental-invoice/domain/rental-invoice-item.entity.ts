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

  private constructor(props: RentalInvoiceItemProps) {
    this.id = props.id;
    this.lineType = props.lineType;
    this.description = props.description;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.lineTotal = props.lineTotal;
    this.sortOrder = props.sortOrder;
  }

  static create(props: Omit<RentalInvoiceItemProps, "id" | "lineTotal">): RentalInvoiceItemProps {
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

    return {
      id: "",
      lineType: props.lineType,
      description,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      lineTotal: computeLineTotalAmount(
        props.quantity,
        props.unitPrice,
      ),
      sortOrder: props.sortOrder,
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
    };
  }
}
