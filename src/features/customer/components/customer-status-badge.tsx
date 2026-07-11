import { SemanticBadge } from "@/components/design-system/badge";

type CustomerStatusBadgeProps = {
  isActive: boolean;
};

export function CustomerStatusBadge({ isActive }: CustomerStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
