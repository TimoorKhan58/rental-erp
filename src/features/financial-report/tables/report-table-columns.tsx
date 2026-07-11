"use client";

import type { DataTableColumn } from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  CustomerReportLine,
  InventoryReportLine,
  ProfitLossAccountLine,
  RentalReportLine,
} from "../types";

export function getAccountAmountColumns(
  amountLabel = "Amount",
): Array<DataTableColumn<ProfitLossAccountLine>> {
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
      id: "amount",
      header: amountLabel,
      cell: (row) => formatCurrency(row.amount),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getRentalReportColumns(): Array<DataTableColumn<RentalReportLine>> {
  return [
    {
      id: "orderNumber",
      header: "Order",
      cell: (row) => row.orderNumber,
    },
    {
      id: "customerName",
      header: "Customer",
      cell: (row) => row.customerName,
    },
    {
      id: "warehouseName",
      header: "Warehouse",
      cell: (row) => row.warehouseName,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => row.status,
    },
    {
      id: "bookingDate",
      header: "Booking date",
      cell: (row) => formatDate(row.bookingDate),
    },
    {
      id: "durationDays",
      header: "Duration",
      cell: (row) => `${row.durationDays}d`,
    },
    {
      id: "grandTotal",
      header: "Total",
      cell: (row) => formatCurrency(row.grandTotal),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getInventoryReportColumns(): Array<DataTableColumn<InventoryReportLine>> {
  return [
    {
      id: "productCode",
      header: "Product",
      cell: (row) => `${row.productCode} — ${row.productName}`,
    },
    {
      id: "warehouseCode",
      header: "Warehouse",
      cell: (row) => `${row.warehouseCode} — ${row.warehouseName}`,
    },
    {
      id: "quantityOnHand",
      header: "On hand",
      cell: (row) => row.quantityOnHand,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "availableQuantity",
      header: "Available",
      cell: (row) => row.availableQuantity,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "inventoryValue",
      header: "Value",
      cell: (row) => formatCurrency(row.inventoryValue),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "stockFlag",
      header: "Flag",
      cell: (row) =>
        row.isLowStock ? "Low stock" : row.isOverstock ? "Overstock" : "—",
    },
  ];
}

export function getCustomerReportColumns(): Array<DataTableColumn<CustomerReportLine>> {
  return [
    {
      id: "customerCode",
      header: "Customer",
      cell: (row) => `${row.customerCode} — ${row.customerName}`,
    },
    {
      id: "orderCount",
      header: "Orders",
      cell: (row) => row.orderCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "completedOrderCount",
      header: "Completed",
      cell: (row) => row.completedOrderCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "revenue",
      header: "Revenue",
      cell: (row) => formatCurrency(row.revenue),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "outstandingBalance",
      header: "Outstanding",
      cell: (row) => formatCurrency(row.outstandingBalance),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "lastOrderDate",
      header: "Last order",
      cell: (row) => (row.lastOrderDate ? formatDate(row.lastOrderDate) : "—"),
    },
  ];
}
