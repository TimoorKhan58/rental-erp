import { SemanticBadge } from "@/components/design-system/badge";

type InventoryStatusBadgeProps = {
  isActive: boolean;
};

export function InventoryStatusBadge({ isActive }: InventoryStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
