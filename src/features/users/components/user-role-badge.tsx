import { SemanticBadge } from "@/components/design-system/badge";
import { USER_ROLE_LABELS, type UserRole } from "@/constants/roles";

type UserRoleBadgeProps = {
  role: UserRole | string;
};

const ROLE_SEMANTIC: Record<string, "info" | "success" | "warning" | "draft"> = {
  owner: "success",
  manager: "info",
  worker: "draft",
  accountant: "warning",
  viewer: "draft",
};

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const label =
    role in USER_ROLE_LABELS
      ? USER_ROLE_LABELS[role as UserRole]
      : role;

  return (
    <SemanticBadge semantic={ROLE_SEMANTIC[role] ?? "info"}>{label}</SemanticBadge>
  );
}
