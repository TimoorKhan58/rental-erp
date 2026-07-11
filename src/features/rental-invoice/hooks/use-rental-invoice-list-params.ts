"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ListRentalInvoicesParams,
  PaymentStatusFilter,
  RentalInvoiceSortField,
  RentalInvoiceStatus,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useRentalInvoiceListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListRentalInvoicesParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as RentalInvoiceSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListRentalInvoicesParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as RentalInvoiceStatus | null) ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      rentalOrderId: searchParams.get("rentalOrderId") ?? undefined,
    };
  }, [searchParams]);

  const invoiceDateFrom = searchParams.get("invoiceDateFrom") ?? undefined;
  const invoiceDateTo = searchParams.get("invoiceDateTo") ?? undefined;
  const paymentStatus =
    (searchParams.get("paymentStatus") as PaymentStatusFilter | null) ?? undefined;

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (updates: Record<string, string | number | boolean | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        next.delete(key);
        return;
      }

      next.set(key, String(value));
    });

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return {
    params,
    invoiceDateFrom,
    invoiceDateTo,
    paymentStatus,
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) => updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setCustomerFilter: (customerId: string | undefined) =>
      updateParams({ customerId, page: DEFAULT_PAGE }),
    setRentalOrderFilter: (rentalOrderId: string | undefined) =>
      updateParams({ rentalOrderId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: RentalInvoiceStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setPaymentStatusFilter: (value: PaymentStatusFilter | undefined) =>
      updateParams({ paymentStatus: value, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ invoiceDateFrom: from, invoiceDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: RentalInvoiceSortField,
      sortOrder: ListRentalInvoicesParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
