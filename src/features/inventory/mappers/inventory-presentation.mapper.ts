import type { InventoryResponse } from "../types";
import { deriveStockStatus, type StockStatus } from "./inventory-stock.mapper";

/**
 * Presentation-only operational labels for inventory list/detail.
 * Derived strictly from authoritative API fields + existing stock-status rules.
 * Does not invent rental lifecycle states (Out/Returning) that inventory records do not carry.
 */
export type InventoryPresentationTone =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export type InventoryPresentationChip = {
  id: string;
  label: string;
  tone: InventoryPresentationTone;
};

const STOCK_STATUS_LABELS: Record<StockStatus, { label: string; tone: InventoryPresentationTone }> =
  {
    "in-stock": { label: "Available", tone: "success" },
    "low-stock": { label: "Shortage", tone: "warning" },
    "out-of-stock": { label: "Out", tone: "error" },
    overstock: { label: "Overstock", tone: "info" },
  };

export function stockStatusPresentationLabel(status: StockStatus): string {
  return STOCK_STATUS_LABELS[status].label;
}

export function stockStatusPresentationTone(status: StockStatus): InventoryPresentationTone {
  return STOCK_STATUS_LABELS[status].tone;
}

/**
 * Compact operational chips for scanning.
 * Uses API `availableQuantity`, `reservedQuantity`, `quantityOnHand`, thresholds via deriveStockStatus.
 */
export function deriveInventoryPresentationChips(
  item: InventoryResponse,
): InventoryPresentationChip[] {
  const chips: InventoryPresentationChip[] = [];
  const status = deriveStockStatus(item);
  const stock = STOCK_STATUS_LABELS[status];

  chips.push({
    id: `stock-${status}`,
    label: stock.label,
    tone: stock.tone,
  });

  if (item.reservedQuantity > 0) {
    chips.push({
      id: "committed",
      label: "Committed",
      tone: "neutral",
    });
  }

  if (!item.isActive) {
    chips.push({
      id: "inactive",
      label: "Inactive",
      tone: "neutral",
    });
  }

  return chips;
}

export function needsInventoryAttention(item: InventoryResponse): boolean {
  const status = deriveStockStatus(item);
  return status === "low-stock" || status === "out-of-stock" || !item.isActive;
}

export type InventoryOperationalAttention = {
  id: string;
  label: string;
  tone: InventoryPresentationTone;
};

/**
 * Detail-page attention signals from related maintenance/repair summaries.
 * Only counts open statuses already defined by those domains.
 */
export function deriveRelatedOperationalAttention(input: {
  maintenances: Array<{ status: string }>;
  repairs: Array<{ status: string }>;
}): InventoryOperationalAttention[] {
  const signals: InventoryOperationalAttention[] = [];

  const openMaintenance = input.maintenances.filter(
    (row) => row.status === "SCHEDULED" || row.status === "IN_PROGRESS",
  ).length;
  const openRepairs = input.repairs.filter(
    (row) => row.status === "PENDING" || row.status === "IN_PROGRESS",
  ).length;

  if (openRepairs > 0) {
    signals.push({
      id: "repair",
      label: openRepairs === 1 ? "1 open repair" : `${openRepairs} open repairs`,
      tone: "warning",
    });
  }

  if (openMaintenance > 0) {
    signals.push({
      id: "repair-maint",
      label:
        openMaintenance === 1
          ? "1 open maintenance"
          : `${openMaintenance} open maintenance`,
      tone: "info",
    });
  }

  return signals;
}
