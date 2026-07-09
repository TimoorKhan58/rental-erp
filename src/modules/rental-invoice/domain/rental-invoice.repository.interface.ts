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
}
