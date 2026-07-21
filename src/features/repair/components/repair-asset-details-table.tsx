"use client";

import { cn, formatCurrency } from "@/lib/utils";
import type { RepairResponse } from "../types";

type RepairAssetDetailsTableProps = {
  repair: RepairResponse;
  productLabel: string;
  warehouseLabel: string;
  className?: string;
};

export function RepairAssetDetailsTable({
  repair,
  productLabel,
  warehouseLabel,
  className,
}: RepairAssetDetailsTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border/60", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left">
            <th className="px-4 py-3 font-medium" scope="col">
              Product
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Warehouse
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Quantity
            </th>
            <th className="px-4 py-3 font-medium text-right" scope="col">
              Repair cost
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Technician
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Notes
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="transition-colors hover:bg-muted/20">
            <td className="px-4 py-3 font-medium">{productLabel}</td>
            <td className="px-4 py-3">{warehouseLabel}</td>
            <td className="px-4 py-3 text-right tabular-nums">{repair.quantity}</td>
            <td className="px-4 py-3 text-right tabular-nums font-medium">
              {formatCurrency(repair.repairCost)}
            </td>
            <td className="px-4 py-3">{repair.technician ?? "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">{repair.repairNotes ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
