import type { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import type { Return } from "@/modules/return/domain";
import type { CreateRentalInvoiceItemData } from "@/modules/rental-invoice/domain/rental-invoice.types";

const LOST_ITEM_CHARGE_MULTIPLIER = 5;
const DAMAGE_CHARGE_MULTIPLIER = 2;

function calculateRentalDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, days);
}

export function buildRentalInvoiceLinesFromOrder(params: {
  rentalOrder: RentalOrder;
  returns: Return[];
}): CreateRentalInvoiceItemData[] {
  const lines: CreateRentalInvoiceItemData[] = [];
  const rentalDays = calculateRentalDays(
    params.rentalOrder.startDate,
    params.rentalOrder.endDate,
  );

  for (const item of params.rentalOrder.items) {
    lines.push({
      lineType: "RENTAL_CHARGE",
      description: `Rental charge (${rentalDays} day${rentalDays === 1 ? "" : "s"})`,
      quantity: item.quantity,
      unitPrice: item.dailyRate * rentalDays,
      sortOrder: lines.length,
    });
  }

  const completedReturns = params.returns.filter(
    (returnRecord) => returnRecord.status === "COMPLETED",
  );

  for (const returnRecord of completedReturns) {
    for (const item of returnRecord.items) {
      const orderItem = params.rentalOrder.items.find(
        (rentalItem) => rentalItem.id === item.rentalOrderItemId,
      );

      if (orderItem === undefined) {
        continue;
      }

      if (item.damagedQuantity > 0) {
        lines.push({
          lineType: "DAMAGE_CHARGE",
          description: `Damage charge — ${returnRecord.returnNumber}`,
          quantity: item.damagedQuantity,
          unitPrice: orderItem.dailyRate * DAMAGE_CHARGE_MULTIPLIER,
          sortOrder: lines.length,
        });
      }

      if (item.lostQuantity > 0) {
        lines.push({
          lineType: "LOST_ITEM_CHARGE",
          description: `Lost item charge — ${returnRecord.returnNumber}`,
          quantity: item.lostQuantity,
          unitPrice: orderItem.dailyRate * LOST_ITEM_CHARGE_MULTIPLIER,
          sortOrder: lines.length,
        });
      }
    }
  }

  return lines;
}
