import { SemanticBadge } from "@/components/design-system/badge";
import type { StockStatus } from "../mappers";

type InventoryStockStatusBadgeProps = {
  status: StockStatus;
};

const statusConfig: Record<
  StockStatus,
  { semantic: "success" | "warning" | "error" | "info"; label: string }
> = {
  "in-stock": { semantic: "success", label: "In stock" },
  "low-stock": { semantic: "warning", label: "Low stock" },
  "out-of-stock": { semantic: "error", label: "Out of stock" },
  overstock: { semantic: "info", label: "Overstock" },
};

export function InventoryStockStatusBadge({ status }: InventoryStockStatusBadgeProps) {
  const config = statusConfig[status];

  return <SemanticBadge semantic={config.semantic}>{config.label}</SemanticBadge>;
}
