import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import prisma from "@/lib/prisma";
import { UnauthorizedError } from "@/shared/infrastructure/errors";

export interface ActiveErpUser {
  readonly roleName: string;
}

/**
 * Enforces ERP User.isActive for an authenticated session bridge.
 * Single enforcement point for API auth and edge proxy — reuses domain rule.
 * Returns ERP role name so RBAC can prefer Role table over AuthUser.role cache.
 */
export async function ensureActiveErpUser(
  erpUserId: string,
): Promise<ActiveErpUser> {
  const user = await prisma.user.findUnique({
    where: { id: erpUserId },
    select: {
      isActive: true,
      role: { select: { name: true } },
    },
  });

  if (user === null) {
    throw new UnauthorizedError({
      message: "User account is not linked to the ERP identity",
    });
  }

  try {
    assertUserIsActive(user.isActive);
  } catch (error) {
    if (error instanceof IdentityUserStateError) {
      throw new UnauthorizedError({
        message: "User account is inactive",
      });
    }

    throw error;
  }

  return { roleName: user.role.name };
}
