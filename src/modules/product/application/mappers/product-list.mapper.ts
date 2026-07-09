import type { ProductListQuery } from "@/modules/product/domain/product-list.query";

import type { ListProductsInput } from "../schemas/list-products.schema";

export function toProductListQuery(input: ListProductsInput): ProductListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
  };
}
