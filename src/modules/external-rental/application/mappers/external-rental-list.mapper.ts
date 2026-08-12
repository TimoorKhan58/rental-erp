import type { ExternalRentalListQuery } from "@/modules/external-rental/domain";

import type { ListExternalRentalsInput } from "../schemas/list-external-rentals.schema";

export function toExternalRentalListQuery(
  input: ListExternalRentalsInput,
): ExternalRentalListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    search: input.search,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    status: input.status,
    settlementStatus: input.settlementStatus,
    supplierId: input.supplierId,
    warehouseId: input.warehouseId,
    rentalOrderId: input.rentalOrderId,
    hireStartFrom: input.hireStartFrom,
    hireStartTo: input.hireStartTo,
  };
}
