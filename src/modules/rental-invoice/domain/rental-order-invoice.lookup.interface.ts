import type { CustomerId, RentalOrderId } from "@/shared/domain/ids";

export interface RentalOrderInvoiceLookupResult {
  readonly id: RentalOrderId;
  readonly customerId: CustomerId;
  readonly status: string;
}

export interface IRentalOrderInvoiceLookup {
  findById(id: RentalOrderId): Promise<RentalOrderInvoiceLookupResult | null>;
}
