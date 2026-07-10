import type { IdentityUser } from "@/modules/identity/domain/identity-user.entity";

export function toIdentityUserAuditValues(
  user: IdentityUser,
): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    role: user.roleName,
    authUserId: user.authUserId,
    isActive: user.isActive,
  };
}
