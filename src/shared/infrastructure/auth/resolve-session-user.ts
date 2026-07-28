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

export async function resolveActiveSessionUser(
  session: Session,
): Promise<ResolvedSessionUser | null> {
  const resolved = resolveSessionUser(session);

  if (resolved === null) {
    return null;
  }

  const erpUser = await prisma.user.findUnique({
    where: { id: resolved.erpUserId },
    select: { id: true, isActive: true },
  });

  if (erpUser === null || !erpUser.isActive) {
    return null;
  }

  return resolved;
}
