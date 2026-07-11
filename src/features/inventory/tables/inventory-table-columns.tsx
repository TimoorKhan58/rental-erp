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
import { deriveStockStatus } from "../mappers";
import { InventoryStatusBadge } from "../components/inventory-status-badge";
import { InventoryStockStatusBadge } from "../components/inventory-stock-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { InventoryResponse, InventorySortField, ListInventoryParams } from "../types";

type InventoryTableColumnOptions = {
  params: ListInventoryParams;
  onSort: (field: InventorySortField, order: ListInventoryParams["sortOrder"]) => void;
  productLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
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
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onToggleStatus,
}: InventoryTableColumnOptions): Array<DataTableColumn<InventoryResponse>> {
  const resolveProductLabel = (productId: string) =>
    productLabelById.get(productId) ?? productId;

  const resolveWarehouseLabel = (warehouseId: string) =>
    warehouseLabelById.get(warehouseId) ?? warehouseId;

  return [
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <Link
          href={ROUTES.inventoryDetail(row.id)}
          className="font-medium text-primary hover:underline"
        >
          {resolveProductLabel(row.productId)}
        </Link>
      ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => resolveWarehouseLabel(row.warehouseId),
    },
    {
      id: "quantityOnHand",
      header: (
        <SortableColumnHeader
          label="On hand"
          field="quantityOnHand"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.quantityOnHand.toLocaleString(),
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
      cell: (row) => row.reservedQuantity.toLocaleString(),
    },
    {
      id: "availableQuantity",
      header: "Available",
      cell: (row) => row.availableQuantity.toLocaleString(),
    },
    {
      id: "minimumStock",
      header: (
        <SortableColumnHeader
          label="Reorder level"
          field="minimumStock"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => row.minimumStock.toLocaleString(),
    },
    {
      id: "stockStatus",
      header: "Stock status",
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
      cell: (row) => formatDateTime(row.updatedAt),
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
