"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  ExpenseSortField,
  ExpenseStatus,
  ExpenseType,
  ListExpensesParams,
} from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useExpenseListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo<ListExpensesParams>(() => {
    return {
      page: Number(searchParams.get("page") ?? DEFAULT_PAGE),
      pageSize: Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE),
      sortBy: (searchParams.get("sortBy") as ExpenseSortField | null) ?? undefined,
      sortOrder:
        (searchParams.get("sortOrder") as ListExpensesParams["sortOrder"]) ??
        "desc",
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as ExpenseStatus | null) ?? undefined,
      expenseType:
        (searchParams.get("expenseType") as ExpenseType | null) ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
    };
  }, [searchParams]);

  const [localSearch, setLocalSearch] = useState(params.search ?? "");

  const updateParams = (
    updates: Record<string, string | number | boolean | undefined>,
  ) => {
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
    localSearch,
    setLocalSearch,
    setPage: (page: number) => updateParams({ page }),
    setPageSize: (pageSize: number) =>
      updateParams({ page: DEFAULT_PAGE, pageSize }),
    setSearch: (search: string) => {
      setLocalSearch(search);
      updateParams({ search, page: DEFAULT_PAGE });
    },
    setStatusFilter: (status: ExpenseStatus | undefined) =>
      updateParams({ status, page: DEFAULT_PAGE }),
    setTypeFilter: (expenseType: ExpenseType | undefined) =>
      updateParams({ expenseType, page: DEFAULT_PAGE }),
    setCategoryFilter: (categoryId: string | undefined) =>
      updateParams({ categoryId, page: DEFAULT_PAGE }),
    setSupplierFilter: (supplierId: string | undefined) =>
      updateParams({ supplierId, page: DEFAULT_PAGE }),
    setSorting: (
      sortBy: ExpenseSortField,
      sortOrder: ListExpensesParams["sortOrder"] = "asc",
    ) => updateParams({ sortBy, sortOrder }),
    refreshKey: searchParams.toString(),
  };
}
