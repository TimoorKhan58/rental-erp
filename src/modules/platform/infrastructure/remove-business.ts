import type { PrismaClient } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, UnprocessableError } from "@/shared/infrastructure/errors";
import { runAsSystem, runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";
import { runTenantTransaction } from "@/shared/infrastructure/tenancy/rls-session";

/**
 * Permanently removing a business that has left (SaaS phase 4d).
 *
 * Rules: it has been deactivated for at least 30 days, its data has been
 * exported since then, the platform owner confirms a backup was taken and
 * types the business's short name.
 *
 * Everything happens in one transaction *inside the business's own scope*:
 * row-level security makes every statement unable to touch another
 * business, and any failure undoes everything. The platform audit log keeps
 * a record that the business existed.
 */

export const REMOVAL_WAIT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type RemovalEligibility = {
  readonly allowed: boolean;
  /** Plain reasons it is not allowed yet (empty when allowed). */
  readonly reasons: readonly string[];
  /** The first day removal is allowed (once deactivated). */
  readonly allowedFrom: string | null;
};

/** Pure decision, unit tested. */
export function evaluateRemoval(input: {
  readonly isActive: boolean;
  readonly deactivatedAt: Date | null;
  readonly lastExportAt: Date | null;
  readonly now: Date;
}): RemovalEligibility {
  if (input.isActive || input.deactivatedAt === null) {
    return { allowed: false, reasons: ["Deactivate the business first."], allowedFrom: null };
  }

  const allowedFrom = new Date(input.deactivatedAt.getTime() + REMOVAL_WAIT_DAYS * DAY_MS);
  const reasons: string[] = [];
  if (input.now.getTime() < allowedFrom.getTime()) {
    reasons.push(`It can be removed ${REMOVAL_WAIT_DAYS} days after deactivation.`);
  }
  if (input.lastExportAt === null || input.lastExportAt.getTime() < input.deactivatedAt.getTime()) {
    reasons.push("Export its data first (after it was deactivated).");
  }
  return { allowed: reasons.length === 0, reasons, allowedFrom: allowedFrom.toISOString() };
}

type ForeignKey = { child: string; parent: string; column: string; required: boolean };

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;
function quote(identifier: string): string {
  if (!SAFE_IDENTIFIER.test(identifier)) throw new Error(`Unexpected identifier: ${identifier}`);
  return `"${identifier}"`;
}

/** Per-business tables and the links between them, read from the database itself. */
async function readTenantGraph(tx: Tx): Promise<{ tables: string[]; foreignKeys: ForeignKey[] }> {
  const tables = (
    await tx.$queryRaw<Array<{ table_name: string }>>`
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'organizationId' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`
  ).map((row) => row.table_name);

  const foreignKeys = (
    await tx.$queryRaw<Array<{ child: string; parent: string; col: string; required: boolean }>>`
      SELECT cl.relname AS child, pl.relname AS parent, a.attname AS col, a.attnotnull AS required
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_class pl ON pl.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f' AND array_length(c.conkey, 1) = 1`
  )
    .filter((row) => tables.includes(row.child) && tables.includes(row.parent) && row.child !== row.parent)
    .map((row) => ({ child: row.child, parent: row.parent, column: row.col, required: row.required }));

  return { tables, foreignKeys };
}

/** Children before parents, using only required links (optional ones are cleared first). */
export function deletionOrder(tables: readonly string[], foreignKeys: readonly ForeignKey[]): string[] {
  const remaining = new Set(tables);
  const order: string[] = [];
  while (remaining.size > 0) {
    const next = [...remaining].filter(
      (table) => !foreignKeys.some((fk) => fk.required && fk.parent === table && fk.child !== table && remaining.has(fk.child)),
    );
    if (next.length === 0) {
      throw new Error(`Cannot order tables for removal (circular links): ${[...remaining].join(", ")}`);
    }
    for (const table of next.sort()) {
      order.push(table);
      remaining.delete(table);
    }
  }
  return order;
}

export type RemovedBusiness = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly removedRecords: number;
  readonly removedLogins: number;
};

export async function removeBusiness(
  prisma: PrismaClient,
  input: {
    readonly organizationId: string;
    readonly confirmSlug: string;
    readonly backupConfirmed: boolean;
    readonly platformOwnerId: string;
    readonly ipAddress?: string | null;
    readonly userAgent?: string | null;
  },
  now: Date = new Date(),
): Promise<RemovedBusiness> {
  const { organizationId } = input;

  const business = await runAsSystem("platform: check business can be removed", async () => {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, isActive: true, deactivatedAt: true },
    });
    if (organization === null) throw new NotFoundError({ message: "Business not found." });

    const lastExport = await prisma.platformAuditLog.findFirst({
      where: { action: "business.exported", targetOrganizationId: organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const eligibility = evaluateRemoval({
      isActive: organization.isActive,
      deactivatedAt: organization.deactivatedAt,
      lastExportAt: lastExport?.createdAt ?? null,
      now,
    });
    if (!eligibility.allowed) {
      throw new ConflictError({ message: eligibility.reasons.join(" "), details: { reasons: eligibility.reasons } });
    }
    return organization;
  });

  if (input.confirmSlug.trim() !== business.slug) {
    throw new UnprocessableError({ message: `Type the short name "${business.slug}" exactly to confirm.` });
  }
  if (!input.backupConfirmed) {
    throw new UnprocessableError({ message: "Confirm that a database backup was taken first." });
  }

  return runInOrganization(organizationId, () =>
    runTenantTransaction(
      prisma,
      async (tx: Tx) => {
        const { tables, foreignKeys } = await readTenantGraph(tx);

        // Logins of this business's users, removed at the end.
        const logins = (
          await tx.$queryRaw<Array<{ authUserId: string }>>`
            SELECT "authUserId" FROM users WHERE "organizationId" = ${organizationId}::uuid AND "authUserId" IS NOT NULL`
        ).map((row) => row.authUserId);

        // 1. Clear optional links inside this business.
        for (const fk of foreignKeys.filter((key) => !key.required)) {
          await tx.$executeRawUnsafe(
            `UPDATE ${quote(fk.child)} SET ${quote(fk.column)} = NULL WHERE "organizationId" = $1::uuid AND ${quote(fk.column)} IS NOT NULL`,
            organizationId,
          );
        }

        // 2. Delete every table's rows, children before parents.
        let removedRecords = 0;
        for (const table of deletionOrder(tables, foreignKeys)) {
          removedRecords += await tx.$executeRawUnsafe(
            `DELETE FROM ${quote(table)} WHERE "organizationId" = $1::uuid`,
            organizationId,
          );
        }

        // 3. Nothing may be left behind.
        for (const table of tables) {
          const left = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*) AS n FROM ${quote(table)} WHERE "organizationId" = $1::uuid`,
            organizationId,
          );
          if (Number(left[0]?.n ?? 0) !== 0) {
            throw new Error(`Removal incomplete: ${table} still has rows`);
          }
        }

        // 4. Logins (their sessions and passwords go with them), then the business.
        const removedLogins =
          logins.length === 0 ? 0 : (await tx.authUser.deleteMany({ where: { id: { in: logins } } })).count;
        await tx.organization.delete({ where: { id: organizationId } });

        // 5. The record that it existed, in the same transaction.
        await tx.platformAuditLog.create({
          data: {
            platformOwnerId: input.platformOwnerId,
            action: "business.removed",
            targetOrganizationId: organizationId,
            details: { name: business.name, slug: business.slug, removedRecords, removedLogins },
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
        });

        return { id: organizationId, name: business.name, slug: business.slug, removedRecords, removedLogins };
      },
      { timeout: 120_000, maxWait: 10_000 },
    ),
  );
}
