import { SemanticBadge } from "@/components/design-system/badge";
import {
  stockStatusPresentationLabel,
  stockStatusPresentationTone,
  type StockStatus,
} from "../mappers";

type InventoryStockStatusBadgeProps = {
  status: StockStatus;
};

const toneToSemantic: Record<
  ReturnType<typeof stockStatusPresentationTone>,
  "success" | "warning" | "error" | "info"
> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "info",
};

export function InventoryStockStatusBadge({ status }: InventoryStockStatusBadgeProps) {
  return (
    <SemanticBadge semantic={toneToSemantic[stockStatusPresentationTone(status)]}>
      {stockStatusPresentationLabel(status)}
    </SemanticBadge>
  );
}
