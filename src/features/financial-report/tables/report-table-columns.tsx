"use client";

import type { DataTableColumn } from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  CustomerReportLine,
  DispatchReportLine,
  InventoryReportLine,
  MaintenanceReportLine,
  ProcurementReportLine,
  ProductReportLine,
  ProfitLossAccountLine,
  RentalReportLine,
  RepairReportLine,
  ReturnReportLine,
  SupplierReportLine,
  WarehouseReportLine,
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

export function getProductReportColumns(): Array<DataTableColumn<ProductReportLine>> {
  return [
    {
      id: "productCode",
      header: "Product",
      cell: (row) => `${row.productCode} — ${row.productName}`,
    },
    {
      id: "rentalPricePerDay",
      header: "Actual rate",
      cell: (row) => formatCurrency(row.rentalPricePerDay),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "rentalCount",
      header: "Rentals",
      cell: (row) => row.rentalCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "rentedQuantity",
      header: "Qty rented",
      cell: (row) => row.rentedQuantity,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "quantityDays",
      header: "Qty-days",
      cell: (row) => row.quantityDays,
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
      id: "quantityOnHand",
      header: "On hand",
      cell: (row) => row.quantityOnHand,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "isRentable",
      header: "Rentable",
      cell: (row) => (row.isRentable ? "Yes" : "No"),
    },
  ];
}

export function getSupplierReportColumns(): Array<DataTableColumn<SupplierReportLine>> {
  return [
    {
      id: "supplierCode",
      header: "Supplier",
      cell: (row) => `${row.supplierCode} — ${row.supplierName}`,
    },
    {
      id: "purchaseOrderCount",
      header: "POs",
      cell: (row) => row.purchaseOrderCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "purchaseTotal",
      header: "Purchase total",
      cell: (row) => formatCurrency(row.purchaseTotal),
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

export function getWarehouseReportColumns(): Array<DataTableColumn<WarehouseReportLine>> {
  return [
    {
      id: "warehouseCode",
      header: "Warehouse",
      cell: (row) => `${row.warehouseCode} — ${row.warehouseName}`,
    },
    {
      id: "productCount",
      header: "Products",
      cell: (row) => row.productCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "inventoryQuantity",
      header: "On hand",
      cell: (row) => row.inventoryQuantity,
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
      id: "utilizationPercent",
      header: "Utilization",
      cell: (row) => `${row.utilizationPercent}%`,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getProcurementReportColumns(): Array<
  DataTableColumn<ProcurementReportLine>
> {
  return [
    {
      id: "poNumber",
      header: "PO",
      cell: (row) => row.poNumber,
    },
    {
      id: "supplierName",
      header: "Supplier",
      cell: (row) => row.supplierName,
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
      id: "orderDate",
      header: "Order date",
      cell: (row) => formatDate(row.orderDate),
    },
    {
      id: "lineCount",
      header: "Lines",
      cell: (row) => row.lineCount,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "purchaseTotal",
      header: "Total",
      cell: (row) => formatCurrency(row.purchaseTotal),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getDispatchReportColumns(): Array<DataTableColumn<DispatchReportLine>> {
  return [
    {
      id: "dispatchNumber",
      header: "Dispatch",
      cell: (row) => row.dispatchNumber,
    },
    {
      id: "orderNumber",
      header: "Order",
      cell: (row) => row.orderNumber,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => row.status,
    },
    {
      id: "dispatchDate",
      header: "Dispatch date",
      cell: (row) => formatDate(row.dispatchDate),
    },
    {
      id: "deliveryMethod",
      header: "Method",
      cell: (row) => row.deliveryMethod ?? "—",
    },
    {
      id: "turnaroundHours",
      header: "Turnaround (h)",
      cell: (row) => (row.turnaroundHours == null ? "—" : row.turnaroundHours),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getReturnReportColumns(): Array<DataTableColumn<ReturnReportLine>> {
  return [
    {
      id: "returnNumber",
      header: "Return",
      cell: (row) => row.returnNumber,
    },
    {
      id: "orderNumber",
      header: "Order",
      cell: (row) => row.orderNumber,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => row.status,
    },
    {
      id: "inspectionDate",
      header: "Inspection",
      cell: (row) => (row.inspectionDate ? formatDate(row.inspectionDate) : "—"),
    },
    {
      id: "damagedQuantity",
      header: "Damaged",
      cell: (row) => row.damagedQuantity,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "lostQuantity",
      header: "Lost",
      cell: (row) => row.lostQuantity,
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getRepairReportColumns(): Array<DataTableColumn<RepairReportLine>> {
  return [
    {
      id: "repairNumber",
      header: "Repair",
      cell: (row) => row.repairNumber,
    },
    {
      id: "productName",
      header: "Product",
      cell: (row) => row.productName,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => row.status,
    },
    {
      id: "repairDate",
      header: "Repair date",
      cell: (row) => formatDate(row.repairDate),
    },
    {
      id: "turnaroundDays",
      header: "Turnaround (d)",
      cell: (row) => (row.turnaroundDays == null ? "—" : row.turnaroundDays),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      id: "actualCost",
      header: "Actual cost",
      cell: (row) =>
        row.actualCost == null ? "—" : formatCurrency(row.actualCost),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}

export function getMaintenanceReportColumns(): Array<
  DataTableColumn<MaintenanceReportLine>
> {
  return [
    {
      id: "maintenanceNumber",
      header: "Maintenance",
      cell: (row) => row.maintenanceNumber,
    },
    {
      id: "productName",
      header: "Product",
      cell: (row) => row.productName,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => row.status,
    },
    {
      id: "serviceType",
      header: "Service type",
      cell: (row) => row.serviceType ?? "—",
    },
    {
      id: "scheduledDate",
      header: "Scheduled",
      cell: (row) => formatDate(row.scheduledDate),
    },
    {
      id: "actualCost",
      header: "Actual cost",
      cell: (row) =>
        row.actualCost == null ? "—" : formatCurrency(row.actualCost),
      className: "text-right",
      headerClassName: "text-right",
    },
  ];
}
