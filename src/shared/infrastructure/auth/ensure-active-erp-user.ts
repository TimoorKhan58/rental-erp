import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import prisma from "@/lib/prisma";
import { UnauthorizedError } from "@/shared/infrastructure/errors";
import { runAsSystem } from "@/shared/infrastructure/tenancy/organization-scope";

export interface ActiveErpUser {
  /** The business (organization) this user works for. */
  readonly organizationId: string;
}

/**
 * Enforces ERP User.isActive (and an active business) for an authenticated
 * session, and returns the user's organization. Single enforcement point for
 * API auth and the page proxy — reuses the domain rule.
 */
export async function ensureActiveErpUser(erpUserId: string): Promise<ActiveErpUser> {
  // Runs before any business is known, so it reads the user as system code.
  const user = await runAsSystem("resolve signed-in user", () =>
    prisma.user.findUnique({
      where: { id: erpUserId },
      select: {
        isActive: true,
        organizationId: true,
        organization: { select: { isActive: true } },
      },
    }),
  );

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

  if (!user.organizationId) {
    throw new UnauthorizedError({
      message: "User account is not linked to a business",
    });
  }

  if (user.organization && !user.organization.isActive) {
    throw new UnauthorizedError({
      message: "This business account is inactive",
    });
  }

  return { organizationId: user.organizationId };
}
