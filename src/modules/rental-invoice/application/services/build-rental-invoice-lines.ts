import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { Return } from "@/modules/return/domain";
import type { CreateRentalInvoiceItemData } from "@/modules/rental-invoice/domain/rental-invoice.types";

export type InvoiceProductNameById = ReadonlyMap<string, string>;
export type InvoiceActualPriceByProductId = ReadonlyMap<string, number>;

export type ConditionChargeOverride = {
  rentalOrderItemId: string;
  damageUnitPrice?: number;
  lossUnitPrice?: number;
};

type LineCondition = {
  damagedQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  notes: string[];
};

function emptyCondition(): LineCondition {
  return {
    damagedQuantity: 0,
    lostQuantity: 0,
    missingQuantity: 0,
    notes: [],
  };
}

function buildConditionByOrderItemId(returns: Return[]): Map<string, LineCondition> {
  const byOrderItemId = new Map<string, LineCondition>();

  for (const returnRecord of returns.filter(
    (returnRecord) => returnRecord.status === "COMPLETED",
  )) {
    for (const item of returnRecord.items) {
      const current = byOrderItemId.get(item.rentalOrderItemId) ?? emptyCondition();

      current.damagedQuantity += item.damagedQuantity;
      current.lostQuantity += item.lostQuantity;
      current.missingQuantity += item.missingQuantity;

      if (item.notes?.trim()) {
        current.notes.push(item.notes.trim());
      }

      byOrderItemId.set(item.rentalOrderItemId, current);
    }
  }

  return byOrderItemId;
}

function formatInspectionNotes(condition: LineCondition): string | null {
  if (condition.notes.length === 0) {
    return null;
  }

  return condition.notes.join("; ");
}

function resolveUnitPrice(params: {
  override?: number;
  actualPrice?: number;
}): number {
  if (params.override !== undefined && Number.isFinite(params.override) && params.override >= 0) {
    return params.override;
  }

  if (params.actualPrice !== undefined && Number.isFinite(params.actualPrice) && params.actualPrice >= 0) {
    return params.actualPrice;
  }

  return 0;
}

function priceSourceLabel(params: {
  override?: number;
  actualPrice?: number;
}): string {
  if (params.override !== undefined && Number.isFinite(params.override) && params.override >= 0) {
    return "price entered at billing";
  }

  if (params.actualPrice !== undefined && Number.isFinite(params.actualPrice) && params.actualPrice > 0) {
    return "actual / replacement price";
  }

  return "price to confirm";
}

export function buildRentalInvoiceLinesFromOrder(params: {
  rentalOrder: RentalOrder;
  returns: Return[];
  productNameById?: InvoiceProductNameById;
  actualPriceByProductId?: InvoiceActualPriceByProductId;
  conditionChargeOverrides?: ConditionChargeOverride[];
}): CreateRentalInvoiceItemData[] {
  const lines: CreateRentalInvoiceItemData[] = [];
  const conditionByOrderItemId = buildConditionByOrderItemId(params.returns);
  const overrideByOrderItemId = new Map(
    (params.conditionChargeOverrides ?? []).map((item) => [item.rentalOrderItemId, item]),
  );

  for (const item of params.rentalOrder.items) {
    const productName =
      params.productNameById?.get(item.productId)?.trim() ||
      `Product ${item.productId.slice(0, 8)}`;
    const condition = conditionByOrderItemId.get(item.id) ?? emptyCondition();
    const inspectionNotes = formatInspectionNotes(condition);
    const rentalTotal = item.quantity * item.dailyRate * item.numberOfDays;
    const override = overrideByOrderItemId.get(item.id);
    const actualPrice = params.actualPriceByProductId?.get(item.productId);

    lines.push({
      lineType: "RENTAL_CHARGE",
      description: `${productName} — rental`,
      quantity: item.quantity,
      unitPrice: item.dailyRate,
      sortOrder: lines.length,
      productName,
      dailyRate: item.dailyRate,
      numberOfDays: item.numberOfDays,
      damagedQuantity: condition.damagedQuantity,
      lostQuantity: condition.lostQuantity,
      missingQuantity: condition.missingQuantity,
      notes: inspectionNotes,
      lineTotal: rentalTotal,
    });

    if (condition.damagedQuantity > 0) {
      const unitPrice = resolveUnitPrice({
        override: override?.damageUnitPrice,
        actualPrice,
      });
      const source = priceSourceLabel({
        override: override?.damageUnitPrice,
        actualPrice,
      });

      lines.push({
        lineType: "DAMAGE_CHARGE",
        description: `Damage charge — ${productName}`,
        quantity: condition.damagedQuantity,
        unitPrice,
        sortOrder: lines.length,
        productName,
        damagedQuantity: condition.damagedQuantity,
        lostQuantity: 0,
        missingQuantity: 0,
        notes: `Damaged item(s): ${condition.damagedQuantity} × charged at ${source}.`,
        lineTotal: condition.damagedQuantity * unitPrice,
      });
    }

    if (condition.lostQuantity > 0) {
      const unitPrice = resolveUnitPrice({
        override: override?.lossUnitPrice,
        actualPrice,
      });
      const source = priceSourceLabel({
        override: override?.lossUnitPrice,
        actualPrice,
      });

      lines.push({
        lineType: "LOST_ITEM_CHARGE",
        description: `Loss charge — ${productName}`,
        quantity: condition.lostQuantity,
        unitPrice,
        sortOrder: lines.length,
        productName,
        damagedQuantity: 0,
        lostQuantity: condition.lostQuantity,
        missingQuantity: 0,
        notes: `Lost item(s): ${condition.lostQuantity} × charged at ${source}.`,
        lineTotal: condition.lostQuantity * unitPrice,
      });
    }

    if (condition.missingQuantity > 0) {
      lines.push({
        lineType: "MANUAL_CHARGE",
        description: `Missing (pending return) — ${productName}`,
        quantity: condition.missingQuantity,
        unitPrice: 0,
        sortOrder: lines.length,
        productName,
        damagedQuantity: 0,
        lostQuantity: 0,
        missingQuantity: condition.missingQuantity,
        notes:
          "No charge now. Customer must return these item(s). If not returned, they will be converted to loss and charged at actual / replacement price.",
        lineTotal: 0,
      });
    }
  }

  return lines;
}

export type OptionalInvoiceCharges = {
  deliveryCharges?: number;
  labourCharges?: number;
  taxAmount?: number;
};

/** Append optional bill extras (skip zero/empty amounts). */
export function appendOptionalInvoiceCharges(
  lines: CreateRentalInvoiceItemData[],
  charges: OptionalInvoiceCharges = {},
): CreateRentalInvoiceItemData[] {
  const result = [...lines];

  const appendCharge = (
    lineType: CreateRentalInvoiceItemData["lineType"],
    description: string,
    amount: number | undefined,
  ) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    result.push({
      lineType,
      description,
      quantity: 1,
      unitPrice: value,
      sortOrder: result.length,
      lineTotal: value,
    });
  };

  appendCharge("DELIVERY_CHARGE", "Delivery charges", charges.deliveryCharges);
  appendCharge("LABOUR_CHARGE", "Labour charge", charges.labourCharges);
  appendCharge("TAX", "Tax", charges.taxAmount);

  return result;
}
