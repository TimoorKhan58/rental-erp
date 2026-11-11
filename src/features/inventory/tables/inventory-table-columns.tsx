"use client";

import Link from "next/link";
import { MoreHorizontalIcon } from "lucide-react";
import type { DataTableColumn } from "@/components/shared";
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
  needsInventoryAttention,
  resolveInventoryRowAccentClass,
} from "../mappers";
import { InventoryPresentationChipBadge } from "../components/inventory-presentation-chip";
import { InventoryQuantityBreakdown } from "../components/inventory-quantity-breakdown";
import { InventoryStockLevelBar } from "../components/inventory-stock-level-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { InventoryResponse, InventorySortField, ListInventoryParams } from "../types";

type InventoryTableColumnOptions = {
  params: ListInventoryParams;
  onSort: (field: InventorySortField, order: ListInventoryParams["sortOrder"]) => void;
  productLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  productNameById: Map<string, string>;
  warehouseNameById: Map<string, string>;
  canUpdate: boolean;
  canDelete: boolean;
  canAdjust: boolean;
  onEdit: (inventory: InventoryResponse) => void;
  onAdjust: (inventory: InventoryResponse) => void;
  onDelete: (inventory: InventoryResponse) => void;
  onToggleStatus: (inventory: InventoryResponse) => void;
};

export function getInventoryTableColumns({
  params,
  onSort,
  productLabelById,
  warehouseLabelById,
  productNameById,
  warehouseNameById,
  canUpdate,
  canDelete,
  canAdjust,
  onEdit,
  onAdjust,
  onDelete,
  onToggleStatus,
}: InventoryTableColumnOptions): Array<DataTableColumn<InventoryResponse>> {
  // Catalog names are seeded as "English / Urdu"; show English only in this column.
  const toEnglishProductName = (name: string) => {
    const separator = name.indexOf(" / ");
    return separator === -1 ? name : name.slice(0, separator).trim();
  };

  const resolveProductName = (productId: string) =>
    toEnglishProductName(
      productNameById.get(productId) ?? productLabelById.get(productId) ?? productId,
    );

  const resolveWarehouseName = (warehouseId: string) =>
    warehouseNameById.get(warehouseId) ?? warehouseLabelById.get(warehouseId) ?? warehouseId;

  return [
    {
      id: "product",
      header: "Item",
      cell: (row) => {
        // Accent semantics are shared with InventoryMobileList so desktop
        // and mobile stay consistent (destructive = out, warning = low,
        // muted = inactive-only, transparent = stock-ok active).
        const accentClass = needsInventoryAttention(row)
          ? resolveInventoryRowAccentClass(row)
          : "border-l-transparent";

        return (
          <div className={cn("min-w-[11rem] border-l-2 pl-2.5", accentClass)}>
            <Link
              href={ROUTES.inventoryDetail(row.id)}
              className="group block"
            >
              <span className="font-medium text-foreground group-hover:text-primary group-hover:underline">
                {resolveProductName(row.productId)}
              </span>
            </Link>
          </div>
        );
      },
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="max-w-[9rem] truncate text-sm text-muted-foreground">
          {resolveWarehouseName(row.warehouseId)}
        </span>
      ),
    },
    {
      id: "quantities",
      header: (
        <SortableColumnHeader
          label="Stock"
          field="quantityOnHand"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <div className="min-w-[12rem] space-y-1.5">
          <InventoryQuantityBreakdown
            quantityOnHand={row.quantityOnHand}
            reservedQuantity={row.reservedQuantity}
            availableQuantity={row.availableQuantity}
          />
          <InventoryStockLevelBar
            available={row.availableQuantity}
            minimum={row.minimumStock}
            maximum={row.maximumStock}
            onHand={row.quantityOnHand}
          />
        </div>
      ),
    },
    {
      id: "minimumStock",
      header: (
        <SortableColumnHeader
          label="Reorder"
          field="minimumStock"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {row.minimumStock.toLocaleString()}
        </span>
      ),
      className: "hidden xl:table-cell",
      headerClassName: "hidden xl:table-cell",
    },
    {
      id: "operationalState",
      header: "Status",
      cell: (row) => {
        const chips = deriveInventoryPresentationChips(row);
        return (
          <div className="flex min-w-[7rem] flex-wrap gap-1">
            {chips.map((chip) => (
              <InventoryPresentationChipBadge
                key={chip.id}
                label={chip.label}
                tone={chip.tone}
              />
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <AppButton
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for inventory ${row.id}`}
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
      ),
      className: "w-12 text-right",
      headerClassName: "w-12",
    },
  ];
}
