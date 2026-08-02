import { APIError } from "better-auth/api";

import prisma from "@/lib/prisma";
import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";

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

  const erpUser = await prisma.user.findUnique({
    where: { id: authUser.erpUserId },
    select: { isActive: true },
  });

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
}
