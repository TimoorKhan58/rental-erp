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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  canAddMaintenance,
  canDisposeAsset,
  canEditAsset,
  canTransferAsset,
  parseMoney,
} from "../mappers";
import { AssetStatusBadge } from "../components/asset-status-badge";
import { SortableColumnHeader } from "./sortable-column-header";
import type { AssetResponse, AssetSortField, ListAssetsParams } from "../types";

type AssetTableColumnOptions = {
  params: ListAssetsParams;
  onSort: (field: AssetSortField, order: ListAssetsParams["sortOrder"]) => void;
  categoryLabelById: Map<string, string>;
  warehouseLabelById: Map<string, string>;
  canUpdate: boolean;
  canTransfer: boolean;
  canDispose: boolean;
  canMaintenance: boolean;
  onTransfer: (asset: AssetResponse) => void;
  onDispose: (asset: AssetResponse) => void;
  onMaintenance: (asset: AssetResponse) => void;
};

export function getAssetTableColumns({
  params,
  onSort,
  categoryLabelById,
  warehouseLabelById,
  canUpdate,
  canTransfer,
  canDispose,
  canMaintenance,
  onTransfer,
  onDispose,
  onMaintenance,
}: AssetTableColumnOptions): Array<DataTableColumn<AssetResponse>> {
  return [
    {
      id: "assetCode",
      header: (
        <SortableColumnHeader
          label="Asset"
          field="assetCode"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <Link href={ROUTES.assetDetail(row.id)} className="group block min-w-[8rem]">
          <span className="font-medium text-primary group-hover:underline">
            {row.assetCode}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
            {row.name}
          </span>
        </Link>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => (
        <span className="text-sm">
          {categoryLabelById.get(row.categoryId) ?? row.categoryId}
        </span>
      ),
    },
    {
      id: "status",
      header: (
        <SortableColumnHeader
          label="Status"
          field="status"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => <AssetStatusBadge status={row.status} />,
    },
    {
      id: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {warehouseLabelById.get(row.warehouseId) ?? row.warehouseId}
        </span>
      ),
    },
    {
      id: "purchaseDate",
      header: (
        <SortableColumnHeader
          label="Purchased"
          field="purchaseDate"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="text-sm">{formatDate(row.purchaseDate)}</span>
      ),
    },
    {
      id: "currentBookValue",
      header: (
        <SortableColumnHeader
          label="Book value"
          field="currentBookValue"
          currentSortBy={params.sortBy}
          currentSortOrder={params.sortOrder}
          onSort={onSort}
        />
      ),
      cell: (row) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(parseMoney(row.currentBookValue))}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) => {
        const showEdit = canUpdate && canEditAsset(row.status);
        const showTransfer = canTransfer && canTransferAsset(row.status);
        const showDispose = canDispose && canDisposeAsset(row.status);
        const showMaintenance = canMaintenance && canAddMaintenance(row.status);
        const hasActions =
          showEdit || showTransfer || showDispose || showMaintenance;

        if (!hasActions) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${row.assetCode}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={ROUTES.assetDetail(row.id)} />}>
                View details
              </DropdownMenuItem>
              {showEdit ? (
                <DropdownMenuItem render={<Link href={ROUTES.assetEdit(row.id)} />}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {showTransfer ? (
                <DropdownMenuItem onClick={() => onTransfer(row)}>
                  Transfer
                </DropdownMenuItem>
              ) : null}
              {showMaintenance ? (
                <DropdownMenuItem onClick={() => onMaintenance(row)}>
                  Record maintenance
                </DropdownMenuItem>
              ) : null}
              {showDispose ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDispose(row)}
                  >
                    Dispose
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      className: "w-12 text-right",
      headerClassName: "w-12",
    },
  ];
}
