import { SemanticBadge } from "@/components/design-system/badge";

type ProductStatusBadgeProps = {
  isActive: boolean;
};

export function ProductStatusBadge({ isActive }: ProductStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
