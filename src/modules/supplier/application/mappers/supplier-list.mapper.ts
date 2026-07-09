import type { SupplierListQuery } from "@/modules/supplier/domain/supplier-list.query";

import type { ListSuppliersInput } from "../schemas/list-suppliers.schema";

export function toSupplierListQuery(input: ListSuppliersInput): SupplierListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
