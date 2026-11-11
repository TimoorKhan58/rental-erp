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
import { cn } from "@/lib/utils";
import {
  deriveInventoryPresentationChips,
  deriveStockStatus,
  needsInventoryAttention,
} from "../mappers";
import { InventoryPresentationChipBadge } from "./inventory-presentation-chip";
import { InventoryQuantityBreakdown } from "./inventory-quantity-breakdown";
import type { InventoryResponse } from "../types";

type InventoryMobileListProps = {
  rows: InventoryResponse[];
  resolveProductName: (productId: string) => string;
  resolveWarehouseName: (warehouseId: string) => string;
  canUpdate: boolean;
  canDelete: boolean;
  canAdjust: boolean;
  onEdit: (inventory: InventoryResponse) => void;
  onAdjust: (inventory: InventoryResponse) => void;
  onDelete: (inventory: InventoryResponse) => void;
  onToggleStatus: (inventory: InventoryResponse) => void;
};

export function InventoryMobileList({
  rows,
  resolveProductName,
  resolveWarehouseName,
  canUpdate,
  canDelete,
  canAdjust,
  onEdit,
  onAdjust,
  onDelete,
  onToggleStatus,
}: InventoryMobileListProps) {
  return (
    <ul className="space-y-2 md:hidden" aria-label="Inventory list">
      {rows.map((row) => {
        const chips = deriveInventoryPresentationChips(row);
        const attention = needsInventoryAttention(row);
        const stockStatus = deriveStockStatus(row);

        return (
          <li
            key={row.id}
            className={cn(
              "rounded-md border border-border bg-card px-3 py-3",
              attention && "border-l-[3px]",
              stockStatus === "out-of-stock" && "border-l-destructive",
              stockStatus === "low-stock" && "border-l-warning",
              !row.isActive && stockStatus !== "out-of-stock" && stockStatus !== "low-stock"
                ? "border-l-muted-foreground/40"
                : null,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <Link
                  href={ROUTES.inventoryDetail(row.id)}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {resolveProductName(row.productId)}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {resolveWarehouseName(row.warehouseId)}
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {chips.map((chip) => (
                    <InventoryPresentationChipBadge
                      key={chip.id}
                      label={chip.label}
                      tone={chip.tone}
                    />
                  ))}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${resolveProductName(row.productId)}`}
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<Link href={ROUTES.inventoryDetail(row.id)} />}>
                    View details
                  </DropdownMenuItem>
                  {canAdjust ? (
                    <DropdownMenuItem onClick={() => onAdjust(row)}>Adjust stock</DropdownMenuItem>
                  ) : null}
                  {canUpdate ? (
                    <DropdownMenuItem onClick={() => onEdit(row)}>Edit thresholds</DropdownMenuItem>
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

            <div className="mt-3 border-t border-border pt-3">
              <InventoryQuantityBreakdown
                quantityOnHand={row.quantityOnHand}
                reservedQuantity={row.reservedQuantity}
                availableQuantity={row.availableQuantity}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
