"use client";

import type { DataTableColumn } from "@/components/shared";
import { formatCurrency } from "@/lib/utils";
import { AccountTypeBadge } from "../components/account-type-badge";
import type { TrialBalanceLine } from "../types";

export function getTrialBalanceColumns(): Array<DataTableColumn<TrialBalanceLine>> {
  return [
    {
      id: "accountCode",
      header: "Account code",
      cell: (row) => row.accountCode,
    },
    {
      id: "accountName",
      header: "Account name",
      cell: (row) => row.accountName,
    },
    {
      id: "accountType",
      header: "Type",
      cell: (row) => <AccountTypeBadge accountType={row.accountType} />,
    },
    {
      id: "totalDebit",
      header: "Total debit",
      cell: (row) => formatCurrency(row.totalDebit),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "totalCredit",
      header: "Total credit",
      cell: (row) => formatCurrency(row.totalCredit),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "endingBalance",
      header: "Ending balance",
      cell: (row) => formatCurrency(row.endingBalance),
      className: "text-right font-medium",
      headerClassName: "text-right",
    },
  ];
}
