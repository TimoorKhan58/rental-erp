"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ListPaymentsParams,
  PaymentMethod,
  PaymentSortField,
  PaymentStatus,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function usePaymentListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListPaymentsParams>(() => {
    const statusParam = searchParams.get("status");

    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as PaymentSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListPaymentsParams["sortOrder"]) ?? "desc",
      search: searchParams.get("search") ?? undefined,
      status: (statusParam as PaymentStatus | null) ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      rentalInvoiceId: searchParams.get("rentalInvoiceId") ?? undefined,
    };
  }, [searchParams]);

  const paymentDateFrom = searchParams.get("paymentDateFrom") ?? undefined;
  const paymentDateTo = searchParams.get("paymentDateTo") ?? undefined;
  const paymentMethod =
    (searchParams.get("paymentMethod") as PaymentMethod | null) ?? undefined;

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
    paymentDateFrom,
    paymentDateTo,
    paymentMethod,
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
    setInvoiceFilter: (rentalInvoiceId: string | undefined) =>
      updateParams({ rentalInvoiceId, page: DEFAULT_PAGE }),
    setStatusFilter: (status: PaymentStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setPaymentMethodFilter: (value: PaymentMethod | undefined) =>
      updateParams({ paymentMethod: value, page: DEFAULT_PAGE }),
    setDateRange: (from?: string, to?: string) =>
      updateParams({ paymentDateFrom: from, paymentDateTo: to, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: PaymentSortField,
      sortOrder: ListPaymentsParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
