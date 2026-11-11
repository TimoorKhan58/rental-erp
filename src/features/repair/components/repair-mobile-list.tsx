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
  canCancelRepair,
  canCompleteRepair,
  canEditRepair,
  canStartRepair,
} from "../mappers";
import { RepairStatusBadge } from "./repair-status-badge";
import type { RepairResponse } from "../types";

type RepairMobileListProps = {
  rows: RepairResponse[];
  resolveProductLabel: (productId: string) => string;
  resolveReturnLabel: (returnId: string) => string;
  canUpdate: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onStart: (repair: RepairResponse) => void;
  onComplete: (repair: RepairResponse) => void;
  onCancel: (repair: RepairResponse) => void;
};

export function RepairMobileList({
  rows,
  resolveProductLabel,
  resolveReturnLabel,
  canUpdate,
  canStart,
  canComplete,
  canCancel,
  onStart,
  onComplete,
  onCancel,
}: RepairMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Repair list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditRepair(row.status);
        const showStart = canStart && canStartRepair(row.status);
        const showComplete = canComplete && canCompleteRepair(row.status);
        const showCancel = canCancel && canCancelRepair(row.status);
        const needsAction = row.status === "PENDING" || row.status === "IN_PROGRESS";

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
                  href={ROUTES.repairDetail(row.id)}
                  className="block min-w-0"
                >
                  <span className="block truncate font-medium text-primary hover:underline">
                    {resolveProductLabel(row.productId)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {row.repairNumber} · {resolveReturnLabel(row.returnId)}
                  </span>
                </Link>
                <p className="text-xs text-muted-foreground">{formatDate(row.repairDate)}</p>
                <p className="tabular-nums text-sm font-medium">
                  {row.quantity.toLocaleString()} units · {formatCurrency(row.repairCost)}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <RepairStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.repairNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.repairDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.repairEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showStart ? (
                    <DropdownMenuItem onClick={() => onStart(row)}>Start repair</DropdownMenuItem>
                  ) : null}
                  {showComplete ? (
                    <DropdownMenuItem onClick={() => onComplete(row)}>
                      Complete repair
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
