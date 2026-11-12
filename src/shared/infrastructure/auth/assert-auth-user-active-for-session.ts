import { APIError } from "better-auth/api";

import prisma from "@/lib/prisma";
import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import { runAsSystem } from "@/shared/infrastructure/tenancy/organization-scope";

/**
 * Blocks Better Auth session creation when the linked ERP user is inactive.
 * Reuses assertUserIsActive — does not duplicate the inactive rule.
 */
export async function assertAuthUserActiveForSession(
  authUserId: string,
): Promise<void> {
  const authUser = await prisma.authUser.findUnique({
    where: { id: authUserId },
    select: { erpUserId: true },
  });

  if (authUser?.erpUserId === null || authUser?.erpUserId === undefined) {
    throw new APIError("UNAUTHORIZED", {
      message: "User account is not linked to the ERP identity",
    });
  }

  // Runs during sign-in, before any business is known.
  const erpUserId = authUser.erpUserId;
  const erpUser = await runAsSystem("sign-in: check user is active", () =>
    prisma.user.findUnique({
      where: { id: erpUserId },
      select: { isActive: true, organization: { select: { isActive: true } } },
    }),
  );

  if (erpUser === null) {
    throw new APIError("UNAUTHORIZED", {
      message: "User account is not linked to the ERP identity",
    });
  }

  try {
    assertUserIsActive(erpUser.isActive);
  } catch (error) {
    if (error instanceof IdentityUserStateError) {
      throw new APIError("FORBIDDEN", {
        message: "User account is inactive",
      });
    }

    throw error;
  }

  if (erpUser.organization && !erpUser.organization.isActive) {
    throw new APIError("FORBIDDEN", {
      message: "This business account is inactive",
    });
  }
}
