import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import prisma from "@/lib/prisma";
import { UnauthorizedError } from "@/shared/infrastructure/errors";

/**
 * Enforces ERP User.isActive for an authenticated session bridge.
 * Single enforcement point for API auth and edge proxy — reuses domain rule.
 */
export async function ensureActiveErpUser(erpUserId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: erpUserId },
    select: { isActive: true },
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
}
