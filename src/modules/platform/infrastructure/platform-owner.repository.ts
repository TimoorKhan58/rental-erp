import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "platformOwner" | "platformAuditLog">;

export type PlatformOwnerIdentity = {
  readonly id: string;
  readonly authUserId: string;
  readonly email: string;
  readonly name: string;
};

/**
 * The active platform owner behind a login, or null. A login linked to an
 * ERP (business) user is never treated as a platform owner, even if a row
 * exists: one login is either a business user or a platform owner.
 */
export async function findActivePlatformOwner(
  db: Db,
  authUserId: string,
): Promise<PlatformOwnerIdentity | null> {
  const row = await db.platformOwner.findUnique({
    where: { authUserId },
    select: {
      id: true,
      isActive: true,
      authUser: { select: { email: true, name: true, erpUserId: true } },
    },
  });

  if (row === null || !row.isActive || row.authUser.erpUserId !== null) {
    return null;
  }

  return {
    id: row.id,
    authUserId,
    email: row.authUser.email,
    name: row.authUser.name,
  };
}

export type PlatformAuditEntry = {
  readonly platformOwnerId: string;
  readonly action: string;
  readonly targetOrganizationId?: string | null;
  readonly details?: Prisma.InputJsonValue;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
};

/** Writes one platform audit row. Platform actions are always recorded. */
export async function recordPlatformAudit(db: Db, entry: PlatformAuditEntry): Promise<void> {
  await db.platformAuditLog.create({
    data: {
      platformOwnerId: entry.platformOwnerId,
      action: entry.action,
      targetOrganizationId: entry.targetOrganizationId ?? null,
      details: entry.details,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    },
  });
}
