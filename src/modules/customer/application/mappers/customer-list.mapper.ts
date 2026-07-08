import type { CustomerListQuery } from "@/modules/customer/domain/customer-list.query";

import type { ListCustomersInput } from "../schemas/list-customers.schema";

export function toCustomerListQuery(input: ListCustomersInput): CustomerListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
