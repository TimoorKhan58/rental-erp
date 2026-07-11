import { SemanticBadge } from "@/components/design-system/badge";

type SupplierStatusBadgeProps = {
  isActive: boolean;
};

export function SupplierStatusBadge({ isActive }: SupplierStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
