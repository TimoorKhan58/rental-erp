import type { RentalInvoiceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalInvoice } from "./rental-invoice.entity";
import type { RentalInvoiceListQuery } from "./rental-invoice-list.query";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
  UpdateRentalInvoiceStatusData,
} from "./rental-invoice.types";

export interface IRentalInvoiceRepository {
  findById(id: RentalInvoiceId): Promise<RentalInvoice | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<RentalInvoice | null>;
  findPaged(
    query: RentalInvoiceListQuery,
  ): Promise<PaginatedResult<RentalInvoice>>;
  create(data: CreateRentalInvoiceData): Promise<RentalInvoice>;
  update(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceData,
  ): Promise<RentalInvoice>;
  updateStatus(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceStatusData,
  ): Promise<RentalInvoice>;
  /**
   * Atomically applies a signed payment delta to invoice money fields.
   * Positive delta records payment; negative delta reverses payment (void).
   * Returns null when predicates fail (concurrency or invariant violation).
   */
  applyPaymentDelta(
    id: RentalInvoiceId,
    delta: number,
  ): Promise<RentalInvoice | null>;
}
