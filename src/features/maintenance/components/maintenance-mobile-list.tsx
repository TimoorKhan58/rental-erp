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
  SERVICE_TYPE_LABELS,
  canCancelMaintenance,
  canCompleteMaintenance,
  canEditMaintenance,
  canStartMaintenance,
} from "../mappers";
import { MaintenanceStatusBadge } from "./maintenance-status-badge";
import type { MaintenanceResponse } from "../types";

type MaintenanceMobileListProps = {
  rows: MaintenanceResponse[];
  resolveProductLabel: (productId: string) => string;
  canUpdate: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  onStart: (maintenance: MaintenanceResponse) => void;
  onComplete: (maintenance: MaintenanceResponse) => void;
  onCancel: (maintenance: MaintenanceResponse) => void;
};

export function MaintenanceMobileList({
  rows,
  resolveProductLabel,
  canUpdate,
  canStart,
  canComplete,
  canCancel,
  onStart,
  onComplete,
  onCancel,
}: MaintenanceMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Maintenance list">
      {rows.map((row) => {
        const showEdit = canUpdate && canEditMaintenance(row.status);
        const showStart = canStart && canStartMaintenance(row.status);
        const showComplete = canComplete && canCompleteMaintenance(row.status);
        const showCancel = canCancel && canCancelMaintenance(row.status);
        const needsAction = row.status === "SCHEDULED" || row.status === "IN_PROGRESS";

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
                  href={ROUTES.maintenanceDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {row.maintenanceNumber}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveProductLabel(row.productId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {SERVICE_TYPE_LABELS[row.serviceType]} · {formatDate(row.scheduledDate)}
                </p>
                <p className="tabular-nums text-sm font-medium">
                  {row.quantity.toLocaleString()} units · {formatCurrency(row.estimatedCost)}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <MaintenanceStatusBadge status={row.status} />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.maintenanceNumber}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.maintenanceDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {showEdit ? (
                    <DropdownMenuItem render={<Link href={ROUTES.maintenanceEdit(row.id)} />}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {showStart ? (
                    <DropdownMenuItem onClick={() => onStart(row)}>
                      Start maintenance
                    </DropdownMenuItem>
                  ) : null}
                  {showComplete ? (
                    <DropdownMenuItem onClick={() => onComplete(row)}>
                      Complete maintenance
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
