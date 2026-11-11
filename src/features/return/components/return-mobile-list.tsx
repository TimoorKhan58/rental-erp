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
import { cn, formatDate } from "@/lib/utils";
import {
  canCancelReturn,
  canCompleteReturn,
  canEditReturn,
  canInspectReturn,
  canReceiveReturn,
  getReturnTotalQuantity,
} from "../mappers";
import { ReturnStatusBadge } from "./return-status-badge";
import type { ReturnResponse } from "../types";

type ReturnMobileListProps = {
  rows: ReturnResponse[];
  resolveOrderLabel: (rentalOrderId: string) => string;
  resolveDispatchLabel: (dispatchId: string) => string;
  canUpdate: boolean;
  canReceive: boolean;
  canInspect: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onReceive: (returnRecord: ReturnResponse) => void;
  onInspect: (returnRecord: ReturnResponse) => void;
  onComplete: (returnRecord: ReturnResponse) => void;
  onCancel: (returnRecord: ReturnResponse) => void;
};

export function ReturnMobileList({
  rows,
  resolveOrderLabel,
  resolveDispatchLabel,
  canUpdate,
  canReceive,
  canInspect,
  canComplete,
  canCancel,
  onReceive,
  onInspect,
  onComplete,
  onCancel,
}: ReturnMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Return list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditReturn(row.status);
        const showReceive = canReceive && canReceiveReturn(row.status);
        const showInspect = canInspect && canInspectReturn(row.status);
        const showComplete = canComplete && canCompleteReturn(row.status);
        const showCancel = canCancel && canCancelReturn(row.status);
        const needsAction =
          row.status === "DRAFT" ||
          row.status === "RECEIVED" ||
          row.status === "INSPECTED";

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
                  href={ROUTES.returnDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.returnNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveOrderLabel(row.rentalOrderId)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveDispatchLabel(row.dispatchId)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(row.returnDate)}</p>
                <p className="tabular-nums text-sm font-medium">
                  {getReturnTotalQuantity(row).toLocaleString()} units
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <ReturnStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.returnNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.returnDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.returnEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showReceive ? (
                    <DropdownMenuItem onClick={() => onReceive(row)}>
                      Mark received
                    </DropdownMenuItem>
                  ) : null}
                  {showInspect ? (
                    <DropdownMenuItem onClick={() => onInspect(row)}>Inspect items</DropdownMenuItem>
                  ) : null}
                  {showComplete ? (
                    <DropdownMenuItem onClick={() => onComplete(row)}>
                      Complete return
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
