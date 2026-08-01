import { APIError } from "better-auth";
import type { Session } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { UserRole } from "@/constants/roles";
import { isUserRole } from "@/shared/application/authorization/types";

export interface ResolvedSessionUser {
  readonly erpUserId: string;
  readonly authUserId: string;
  readonly role: UserRole;
  readonly email: string;
  readonly name: string;
}

type SessionUserWithBridge = Session["user"] & {
  erpUserId?: string | null;
};

const INACTIVE_OR_UNLINKED_MESSAGE =
  "User account is inactive or not linked to the ERP identity";

export function resolveSessionUser(
  session: Session,
): ResolvedSessionUser | null {
  const user = session.user as SessionUserWithBridge;
  const erpUserId = user.erpUserId?.trim();

  if (erpUserId === undefined || erpUserId.length === 0) {
    return null;
  }

  if (!isUserRole(user.role)) {
    return null;
  }

  return {
    erpUserId,
    authUserId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export function getSessionErpUserId(session: Session): string | undefined {
  return resolveSessionUser(session)?.erpUserId;
}

/** Shared ERP active check used by API auth and Better Auth session creation. */
export async function isErpUserActive(erpUserId: string): Promise<boolean> {
  const erpUser = await prisma.user.findUnique({
    where: { id: erpUserId },
    select: { id: true, isActive: true },
  });

  return erpUser !== null && erpUser.isActive;
}

/**
 * Resolve an active ERP session user.
 * Role is loaded from the ERP User→Role relation (not the cookie-cached AuthUser.role)
 * so demotions take effect immediately even when cookie cache is enabled.
 */
export async function resolveActiveSessionUser(
  session: Session,
): Promise<ResolvedSessionUser | null> {
  const resolved = resolveSessionUser(session);

  if (resolved === null) {
    return null;
  }

  const erpUser = await prisma.user.findUnique({
    where: { id: resolved.erpUserId },
    select: {
      id: true,
      isActive: true,
      role: { select: { name: true } },
    },
  });

  if (erpUser === null || !erpUser.isActive) {
    return null;
  }

  if (!isUserRole(erpUser.role.name)) {
    return null;
  }

  return {
    erpUserId: resolved.erpUserId,
    authUserId: resolved.authUserId,
    role: erpUser.role.name,
    email: resolved.email,
    name: resolved.name,
  };
}

/**
 * Abort Better Auth session creation when the AuthUser is not linked to an
 * active ERP User. Throws Better Auth APIError so no session row or cookies
 * are written.
 */
export async function assertAuthUserMayCreateSession(
  authUserId: string,
): Promise<void> {
  const authUser = await prisma.authUser.findUnique({
    where: { id: authUserId },
    select: { erpUserId: true },
  });

  const erpUserId = authUser?.erpUserId?.trim();

  if (erpUserId === undefined || erpUserId.length === 0) {
    throw APIError.fromStatus("UNAUTHORIZED", {
      message: INACTIVE_OR_UNLINKED_MESSAGE,
    });
  }

  if (!(await isErpUserActive(erpUserId))) {
    throw APIError.fromStatus("UNAUTHORIZED", {
      message: INACTIVE_OR_UNLINKED_MESSAGE,
    });
  }
}
