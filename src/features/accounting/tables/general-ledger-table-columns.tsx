"use client";

import type { DataTableColumn } from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import { REFERENCE_TYPE_LABELS } from "../mappers";
import type { LedgerEntryLine } from "../types";

export function getGeneralLedgerColumns(): Array<DataTableColumn<LedgerEntryLine>> {
  return [
    {
      id: "journalDate",
      header: "Date",
      cell: (row) => formatDate(row.journalDate),
    },
    {
      id: "journalNumber",
      header: "Journal",
      cell: (row) => row.journalNumber,
    },
    {
      id: "description",
      header: "Description",
      cell: (row) => row.description,
    },
    {
      id: "referenceType",
      header: "Reference",
      cell: (row) =>
        row.referenceType ? REFERENCE_TYPE_LABELS[row.referenceType] : "—",
    },
    {
      id: "debit",
      header: "Debit",
      cell: (row) => (row.debit > 0 ? formatCurrency(row.debit) : "—"),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "credit",
      header: "Credit",
      cell: (row) => (row.credit > 0 ? formatCurrency(row.credit) : "—"),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "runningBalance",
      header: "Balance",
      cell: (row) => formatCurrency(row.runningBalance),
      className: "text-right font-medium",
      headerClassName: "text-right",
    },
  ];
}
