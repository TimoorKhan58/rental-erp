import type {
  IRentalOrderInvoiceLookup,
  RentalOrderInvoiceLookupResult,
} from "@/modules/rental-invoice/domain/rental-order-invoice.lookup.interface";
import type { RentalOrderId } from "@/shared/domain/ids";

import {
  CUSTOMER_ID,
  RENTAL_ORDER_ID,
} from "./rental-invoice.fixtures";

export class InMemoryRentalOrderInvoiceLookup
  implements IRentalOrderInvoiceLookup
{
  private readonly store = new Map<string, RentalOrderInvoiceLookupResult>();

  seed(orders: RentalOrderInvoiceLookupResult[]): void {
    this.store.clear();
    for (const order of orders) {
      this.store.set(order.id, { ...order });
    }
  }

  findById(id: RentalOrderId): Promise<RentalOrderInvoiceLookupResult | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? { ...stored } : null);
  }
}

export function createCompletedRentalOrderLookup(
  override: Partial<RentalOrderInvoiceLookupResult> = {},
): InMemoryRentalOrderInvoiceLookup {
  const lookup = new InMemoryRentalOrderInvoiceLookup();
  lookup.seed([
    {
      id: RENTAL_ORDER_ID,
      customerId: CUSTOMER_ID,
      status: "COMPLETED",
      ...override,
    },
  ]);
  return lookup;
}
