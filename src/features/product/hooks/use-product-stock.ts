import { useQuery } from "@tanstack/react-query";
import { getInventoryList } from "@/features/inventory/services";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { queryKeys } from "@/lib/query";

/**
 * How many of each product are free to rent right now, over all warehouses.
 * Summed from the inventory list, so it needs no new API. `undefined` until
 * loaded, or when the person may not see stock (the column is then hidden).
 */
export function useProductStock() {
  const query = useQuery({
    queryKey: queryKeys.inventory.list({ all: true, byProduct: true }),
    queryFn: () => fetchAllPages(getInventoryList, {}),
    staleTime: 60_000,
    retry: false,
  });

  if (!query.isSuccess) {
    return undefined;
  }

  const freeByProduct = new Map<string, { free: number; inStock: number }>();
  for (const row of query.data.items) {
    if (!row.isActive) {
      continue;
    }
    const current = freeByProduct.get(row.productId) ?? { free: 0, inStock: 0 };
    freeByProduct.set(row.productId, {
      free: current.free + row.availableQuantity,
      inStock: current.inStock + row.quantityOnHand,
    });
  }
  return freeByProduct;
}
