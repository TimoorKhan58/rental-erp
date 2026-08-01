import { SemanticBadge } from "@/components/design-system/badge";

type UserStatusBadgeProps = {
  isActive: boolean;
};

export function UserStatusBadge({ isActive }: UserStatusBadgeProps) {
  return (
    <SemanticBadge semantic={isActive ? "active" : "inactive"}>
      {isActive ? "Active" : "Inactive"}
    </SemanticBadge>
  );
}
