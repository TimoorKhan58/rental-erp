import { SemanticBadge } from "@/components/design-system/badge";

type WarehouseStatusBadgeProps = {
  isActive: boolean;
};

export function WarehouseStatusBadge({ isActive }: WarehouseStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
