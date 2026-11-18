import { APIError } from "better-auth/api";

import prisma from "@/lib/prisma";
import { assertUserIsActive } from "@/modules/identity/domain/identity-user.rules";
import { IdentityUserStateError } from "@/modules/identity/domain/identity-user.errors";
import {
  findActivePlatformOwner,
  recordPlatformAudit,
} from "@/modules/platform/infrastructure/platform-owner.repository";
import { runAsSystem } from "@/shared/infrastructure/tenancy/organization-scope";

export type SessionRequestInfo = {
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
};

/**
 * Blocks Better Auth session creation when the linked ERP user is inactive.
 * Reuses assertUserIsActive — does not duplicate the inactive rule.
 *
 * A login with no ERP user may only sign in as an active platform owner
 * (SaaS phase 3b); that sign-in is written to the platform audit log.
 */
export async function assertAuthUserActiveForSession(
  authUserId: string,
  requestInfo: SessionRequestInfo = {},
): Promise<void> {
  const authUser = await prisma.authUser.findUnique({
    where: { id: authUserId },
    select: { erpUserId: true },
  });

  if (authUser !== null && authUser.erpUserId === null) {
    const owner = await findActivePlatformOwner(prisma, authUserId);

    if (owner !== null) {
      await recordPlatformAudit(prisma, {
        platformOwnerId: owner.id,
        action: "platform.sign_in",
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
      return;
    }
  }

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

  // Last sign-in, shown to the platform owner (SaaS phase 4c). Never blocks
  // signing in.
  await runAsSystem("sign-in: record last sign-in", () =>
    prisma.user.update({
      where: { id: erpUserId },
      data: { lastSignInAt: new Date() },
      select: { id: true },
    }),
  ).catch(() => undefined);
}
