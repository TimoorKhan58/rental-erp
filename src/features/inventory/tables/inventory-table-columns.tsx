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
import { formatDateTime } from "@/lib/utils";
import { deriveStockStatus, calculateInventoryRecovery } from "../mappers";
import { InventoryStatusBadge } from "../components/inventory-status-badge";
import { InventoryStockStatusBadge } from "../components/inventory-stock-status-badge";
import { InventoryRecoveryIndicator } from "../components/inventory-recovery-indicator";
import { InventoryStockLevelBar } from "../components/inventory-stock-level-bar";
import { SortableColumnHeader } from "./sortable-column-header";
import type { InventoryResponse, InventorySortField, ListInventoryParams } from "../types";
import type { ProductPricing, ProductRecoveryStats } from "../mappers";

type InventoryTableColumnOptions = {
  params: ListInventoryParams;
  onSort: (field: InventorySortField, order: ListInventoryParams["sortOrder"]) => void;
  productLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  productNameById: Map<string, string>;
  warehouseNameById: Map<string, string>;
  productPricingById: Map<string, ProductPricing>;
  productRecoveryById: Map<string, ProductRecoveryStats>;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (inventory: InventoryResponse) => void;
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
  productPricingById,
  productRecoveryById,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
}: InventoryTableColumnOptions): Array<DataTableColumn<InventoryResponse>> {
  const resolveProductName = (productId: string) =>
    productNameById.get(productId) ?? productLabelById.get(productId) ?? productId;

  const resolveWarehouseName = (warehouseId: string) =>
    warehouseNameById.get(warehouseId) ?? warehouseLabelById.get(warehouseId) ?? warehouseId;

  return [
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <Link
          href={ROUTES.inventoryDetail(row.id)}
          className="group block min-w-[10rem]"
        >
          <span className="font-medium text-primary group-hover:underline">
            {resolveProductName(row.productId)}
          </span>
        </Link>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="text-sm">{resolveWarehouseName(row.warehouseId)}</span>
      ),
    },
    {
      id: "stockLevel",
      header: "Stock level",
      cell: (row) => (
        <div className="min-w-[8rem] space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
            <span className="font-medium">{row.availableQuantity.toLocaleString()}</span>
            <span className="text-muted-foreground">/ {row.quantityOnHand.toLocaleString()}</span>
          </div>
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
      id: "reservedQuantity",
      header: (
        <SortableColumnHeader
          label="Reserved"
          field="reservedQuantity"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {row.reservedQuantity.toLocaleString()}
        </span>
      ),
    },
    {
      id: "recovery",
      header: "Recovery",
      cell: (row) => (
        <InventoryRecoveryIndicator
          metrics={calculateInventoryRecovery({
            quantityOnHand: row.quantityOnHand,
            reservedQuantity: row.reservedQuantity,
            pricing: productPricingById.get(row.productId),
            productRecovery: productRecoveryById.get(row.productId),
          })}
        />
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
        <span className="tabular-nums">{row.minimumStock.toLocaleString()}</span>
      ),
    },
    {
      id: "stockStatus",
      header: "Stock",
      cell: (row) => (
        <InventoryStockStatusBadge status={deriveStockStatus(row)} />
      ),
    },
    {
      id: "isActive",
      header: (
        <SortableColumnHeader
          label="Status"
          field="isActive"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <InventoryStatusBadge isActive={row.isActive} />,
    },
    {
      id: "updatedAt",
      header: (
        <SortableColumnHeader
          label="Updated"
          field="updatedAt"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.updatedAt)}</span>
      ),
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
            {canUpdate ? (
              <DropdownMenuItem onClick={() => onEdit(row)}>Edit quantities</DropdownMenuItem>
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
