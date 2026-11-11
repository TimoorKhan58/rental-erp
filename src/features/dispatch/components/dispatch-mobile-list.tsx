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
  canCancelDispatch,
  canCompleteDispatch,
  canEditDispatch,
  canMarkDispatchReady,
  DELIVERY_METHOD_LABELS,
  getDispatchTotalQuantity,
} from "../mappers";
import { DispatchStatusBadge } from "./dispatch-status-badge";
import type { DispatchResponse } from "../types";

type DispatchMobileListProps = {
  rows: DispatchResponse[];
  resolveOrderLabel: (rentalOrderId: string) => string;
  resolveCustomerName: (rentalOrderId: string) => string;
  canUpdate: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onMarkReady: (dispatch: DispatchResponse) => void;
  onComplete: (dispatch: DispatchResponse) => void;
  onCancel: (dispatch: DispatchResponse) => void;
};

export function DispatchMobileList({
  rows,
  resolveOrderLabel,
  resolveCustomerName,
  canUpdate,
  canComplete,
  canCancel,
  onMarkReady,
  onComplete,
  onCancel,
}: DispatchMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Dispatch list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditDispatch(row.status);
        const showReady = canUpdate && canMarkDispatchReady(row.status);
        const showComplete = canComplete && canCompleteDispatch(row.status);
        const showCancel = canCancel && canCancelDispatch(row.status);
        const needsAction = row.status === "DRAFT" || row.status === "READY";

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
                  href={ROUTES.dispatchDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.dispatchNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveOrderLabel(row.rentalOrderId)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveCustomerName(row.rentalOrderId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {DELIVERY_METHOD_LABELS[row.deliveryMethod]} · {formatDate(row.dispatchDate)}
                </p>
                <p className="tabular-nums text-sm font-medium">
                  {getDispatchTotalQuantity(row).toLocaleString()} units
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <DispatchStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.dispatchNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.dispatchDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.dispatchEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showReady ? (
                    <DropdownMenuItem onClick={() => onMarkReady(row)}>Mark ready</DropdownMenuItem>
                  ) : null}
                  {showComplete ? (
                    <DropdownMenuItem onClick={() => onComplete(row)}>
                      Complete dispatch
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
