"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  canApproveProcurement,
  canCancelProcurement,
  canEditProcurement,
  canReceiveProcurement,
} from "../mappers";
import { ProcurementStatusBadge } from "./procurement-status-badge";
import type { ProcurementResponse } from "../types";

type ProcurementMobileListProps = {
  rows: ProcurementResponse[];
  resolveSupplierLabel: (supplierId: string) => string;
  resolveWarehouseLabel: (warehouseId: string) => string;
  canUpdate: boolean;
  canApprove: boolean;
  canReceive: boolean;
  canCancel: boolean;
  onApprove: (procurement: ProcurementResponse) => void;
  onReceive: (procurement: ProcurementResponse) => void;
  onCancel: (procurement: ProcurementResponse) => void;
};

export function ProcurementMobileList({
  rows,
  resolveSupplierLabel,
  resolveWarehouseLabel,
  canUpdate,
  canApprove,
  canReceive,
  canCancel,
  onApprove,
  onReceive,
  onCancel,
}: ProcurementMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Purchase order list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditProcurement(row.status);
        const showApprove = canApprove && canApproveProcurement(row.status);
        const showReceive = canReceive && canReceiveProcurement(row.status);
        const showCancel = canCancel && canCancelProcurement(row.status, row.items);
        const needsAction =
          row.status === "DRAFT" ||
          row.status === "APPROVED" ||
          row.status === "PARTIALLY_RECEIVED";
        const totalReceived = row.items.reduce(
          (sum, item) => sum + item.receivedQuantity,
          0,
        );
        const totalOrdered = row.items.reduce((sum, item) => sum + item.quantity, 0);

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              row.status === "CANCELLED" && "border-l-[3px] border-l-muted-foreground/40",
              needsAction && "border-l-[3px] border-l-warning",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={ROUTES.procurementDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.poNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveSupplierLabel(row.supplierId)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveWarehouseLabel(row.warehouseId)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(row.orderDate)}</p>
                <p className="tabular-nums text-sm font-medium">
                  {formatCurrency(row.orderTotal)}
                  {row.paidAmount > 0 ? ` · Paid ${formatCurrency(row.paidAmount)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Received {totalReceived} / {totalOrdered}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <ProcurementStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.poNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.procurementDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.procurementEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showApprove ? (
                    <DropdownMenuItem onClick={() => onApprove(row)}>Approve</DropdownMenuItem>
                  ) : null}
                  {showReceive ? (
                    <DropdownMenuItem onClick={() => onReceive(row)}>
                      Receive goods
                    </DropdownMenuItem>
                  ) : null}
                  {showCancel ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onCancel(row)}>
                        Cancel
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
