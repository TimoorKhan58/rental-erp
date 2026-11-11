"use client";

import Link from "next/link";
import { MoreHorizontalIcon, PhoneIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { CustomerStatusBadge } from "./customer-status-badge";
import type { CustomerResponse } from "../types";

type CustomerMobileListProps = {
  rows: CustomerResponse[];
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (customer: CustomerResponse) => void;
  onToggleStatus: (customer: CustomerResponse) => void;
};

export function CustomerMobileList({
  rows,
  canUpdate,
  canDelete,
  onDelete,
  onToggleStatus,
}: CustomerMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Customer list">
      {rows.map((row) => (
        <li
          key={row.id}
          className={cn(
            "rounded-md border border-border bg-card px-3 py-3",
            !row.isActive && "border-l-[3px] border-l-muted-foreground/40",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <Link
                href={ROUTES.customerDetail(row.id)}
                className="block truncate font-medium text-primary hover:underline"
              >
                {row.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{row.customerCode}</p>
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <PhoneIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {row.phone}
              </p>
              <div className="pt-0.5">
                <CustomerStatusBadge isActive={row.isActive} />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <AppButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${row.name}`}
                  />
                }
              >
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={ROUTES.customerDetail(row.id)} />}>
                  View details
                </DropdownMenuItem>
                {canUpdate ? (
                  <DropdownMenuItem render={<Link href={ROUTES.customerEdit(row.id)} />}>
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {canUpdate ? (
                  <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                    {row.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(row)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </li>
      ))}
    </ul>
  );
}
