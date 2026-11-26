import { useQuery } from "@tanstack/react-query";
import { getExternalRentals } from "@/features/external-rental/services";
import { getProcurements } from "@/features/procurement/services";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import { queryKeys } from "@/lib/query";

/**
 * What you still owe each supplier: unpaid purchases plus unpaid hire-ins.
 * Summed from the lists (a business has few of each), so it needs no new API.
 * Returns an empty map until loaded or when the person may not see them.
 */
export function useSupplierBalances() {
  const purchases = useQuery({
    queryKey: queryKeys.procurement.list({ all: true, summary: true }),
    queryFn: () => fetchAllPages(getProcurements, {}),
    staleTime: 60_000,
    retry: false,
  });
  const hireIns = useQuery({
    queryKey: queryKeys.externalRentals.list({ all: true, summary: true }),
    queryFn: () => fetchAllPages(getExternalRentals, {}),
    staleTime: 60_000,
    retry: false,
  });

  const owedBySupplier = new Map<string, number>();
  for (const order of purchases.data?.items ?? []) {
    if (order.status !== "CANCELLED" && order.balance > 0) {
      owedBySupplier.set(order.supplierId, (owedBySupplier.get(order.supplierId) ?? 0) + order.balance);
    }
  }
  for (const hire of hireIns.data?.items ?? []) {
    if (hire.status !== "CANCELLED" && hire.outstandingBalance > 0) {
      owedBySupplier.set(hire.supplierId, (owedBySupplier.get(hire.supplierId) ?? 0) + hire.outstandingBalance);
    }
  }

  return {
    owedBySupplier,
    isLoaded: purchases.isSuccess || hireIns.isSuccess,
  };
}
