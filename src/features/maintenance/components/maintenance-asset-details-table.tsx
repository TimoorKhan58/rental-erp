"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { SERVICE_TYPE_LABELS } from "../mappers";
import type { MaintenanceResponse } from "../types";

type MaintenanceAssetDetailsTableProps = {
  maintenance: MaintenanceResponse;
  productLabel: string;
  warehouseLabel: string;
  className?: string;
};

export function MaintenanceAssetDetailsTable({
  maintenance,
  productLabel,
  warehouseLabel,
  className,
}: MaintenanceAssetDetailsTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Product
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Warehouse
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Service type
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Quantity
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Est. cost
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Actual cost
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Technician
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Vendor
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="transition-colors hover:bg-muted/20">
            <td className="px-4 py-3 font-medium">{productLabel}</td>
            <td className="px-4 py-3">{warehouseLabel}</td>
            <td className="px-4 py-3">{SERVICE_TYPE_LABELS[maintenance.serviceType]}</td>
            <td className="px-4 py-3 text-right tabular-nums">{maintenance.quantity}</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatCurrency(maintenance.estimatedCost)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums font-medium">
              {formatCurrency(maintenance.actualCost)}
            </td>
            <td className="px-4 py-3">{maintenance.technician ?? "—"}</td>
            <td className="px-4 py-3">{maintenance.vendor ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
