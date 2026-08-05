import { SemanticBadge } from "@/components/design-system/badge";
import { USER_ROLE_LABELS } from "@/constants/roles";
import type { UserRole } from "@/constants/roles";

const roleSemantic: Record<
  UserRole,
  "info" | "success" | "warning" | "draft" | "archived"
> = {
  owner: "warning",
  manager: "info",
  worker: "success",
  accountant: "archived",
  viewer: "draft",
};

type UserRoleBadgeProps = {
  role: UserRole;
};

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  return (
    <SemanticBadge semantic={roleSemantic[role]}>
      {USER_ROLE_LABELS[role]}
    </SemanticBadge>
  );
}
