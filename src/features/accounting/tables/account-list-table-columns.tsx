"use client";

import Link from "next/link";
import type { DataTableColumn } from "@/components/shared";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/lib/utils";
import { AccountTypeBadge } from "../components/account-type-badge";
import { SortableColumnHeader } from "./account-sortable-column-header";
import type { AccountResponse, AccountSortField, ListAccountsParams } from "../types";

type AccountTableColumnOptions = {
  params: ListAccountsParams;
  onSort: (field: AccountSortField, order: ListAccountsParams["sortOrder"]) => void;
};

export function getAccountTableColumns({
  params,
  onSort,
}: AccountTableColumnOptions): Array<DataTableColumn<AccountResponse>> {
  return [
    {
      id: "accountCode",
      header: (
        <SortableColumnHeader
          label="Account code"
          field="accountCode"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link
          href={`${ROUTES.accountingGeneralLedger}?accountId=${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.accountCode}
        </Link>
      ),
    },
    {
      id: "name",
      header: (
        <SortableColumnHeader
          label="Name"
          field="name"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.name,
    },
    {
      id: "accountType",
      header: (
        <SortableColumnHeader
          label="Type"
          field="accountType"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <AccountTypeBadge accountType={row.accountType} />,
    },
    {
      id: "description",
      header: "Description",
      cell: (row) => row.description ?? "—",
    },
    {
      id: "isActive",
      header: (
        <SortableColumnHeader
          label="Status"
          field="isActive"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (row.isActive ? "Active" : "Inactive"),
    },
    {
      id: "createdAt",
      header: (
        <SortableColumnHeader
          label="Created"
          field="createdAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => formatDate(row.createdAt),
    },
  ];
}
