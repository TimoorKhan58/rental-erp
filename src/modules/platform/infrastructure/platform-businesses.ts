import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { USER_ROLES } from "@/constants/roles";
import { BetterAuthCredentialGateway } from "@/modules/identity/infrastructure/gateways/better-auth-credential.gateway";
import { mapPrismaError } from "@/shared/infrastructure/database/prisma-error-mapper";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";
import { runAsSystem, runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";
import { runTenantTransaction } from "@/shared/infrastructure/tenancy/rls-session";

import type { CreateBusinessInput } from "../application/platform-business.schemas";
import { applyBusinessStarterKit, type StarterKitResult } from "./provision-business";
import { evaluateRemoval, type RemovalEligibility } from "./remove-business";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type PlatformBusinessSummary = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly owner: { readonly name: string; readonly email: string } | null;
  readonly users: number;
  readonly rentalOrders: number;
  readonly lastOrderAt: string | null;
  /** Plan and usage (SaaS phase 4c); null limits mean "no limit". */
  readonly plan: { readonly name: string | null; readonly maxUsers: number | null; readonly maxWarehouses: number | null };
  readonly activeUsers: number;
  readonly activeWarehouses: number;
  readonly lastSignInAt: string | null;
  /** SaaS phase 4d: when it was deactivated and whether it may be removed. */
  readonly deactivatedAt: string | null;
  readonly lastExportAt: string | null;
  readonly removal: RemovalEligibility;
};

/** Every business with its owner and activity (platform code only). */
export function listBusinesses(prisma: PrismaClient): Promise<PlatformBusinessSummary[]> {
  return runAsSystem("platform: list businesses", async () => {
    const exports = await prisma.platformAuditLog.groupBy({
      by: ["targetOrganizationId"],
      where: { action: "business.exported" },
      _max: { createdAt: true },
    });
    const now = new Date();
    const [organizations, users, activeUsers, activeWarehouses, orders, owners] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          planName: true,
          maxUsers: true,
          maxWarehouses: true,
          deactivatedAt: true,
        },
      }),
      prisma.user.groupBy({ by: ["organizationId"], _count: { _all: true }, _max: { lastSignInAt: true } }),
      prisma.user.groupBy({ by: ["organizationId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.warehouse.groupBy({ by: ["organizationId"], where: { isActive: true }, _count: { _all: true } }),
      prisma.rentalOrder.groupBy({
        by: ["organizationId"],
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.user.findMany({
        where: { role: { name: USER_ROLES.OWNER } },
        orderBy: { createdAt: "asc" },
        select: { organizationId: true, name: true, email: true },
      }),
    ]);

    return organizations.map((organization) => {
      const userRow = users.find((row) => row.organizationId === organization.id);
      const orderRow = orders.find((row) => row.organizationId === organization.id);
      const owner = owners.find((row) => row.organizationId === organization.id);
      const lastExport = exports.find((row) => row.targetOrganizationId === organization.id)?._max.createdAt;
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        isActive: organization.isActive,
        createdAt: organization.createdAt.toISOString(),
        owner: owner ? { name: owner.name, email: owner.email } : null,
        users: userRow?._count._all ?? 0,
        rentalOrders: orderRow?._count._all ?? 0,
        lastOrderAt: orderRow?._max.createdAt?.toISOString() ?? null,
        plan: {
          name: organization.planName,
          maxUsers: organization.maxUsers,
          maxWarehouses: organization.maxWarehouses,
        },
        activeUsers: activeUsers.find((row) => row.organizationId === organization.id)?._count._all ?? 0,
        activeWarehouses:
          activeWarehouses.find((row) => row.organizationId === organization.id)?._count._all ?? 0,
        lastSignInAt: userRow?._max.lastSignInAt?.toISOString() ?? null,
        deactivatedAt: organization.deactivatedAt?.toISOString() ?? null,
        lastExportAt: lastExport?.toISOString() ?? null,
        removal: evaluateRemoval({
          isActive: organization.isActive,
          deactivatedAt: organization.deactivatedAt,
          lastExportAt: lastExport ?? null,
          now,
        }),
      };
    });
  });
}

export type CreatedBusiness = {
  readonly id: string;
  readonly slug: string;
  readonly ownerUserId: string;
  readonly starterKit: StarterKitResult;
};

/**
 * Creates a business, its starter kit and its owner login in one
 * transaction (all or nothing). The owner must choose a new password at
 * first sign-in.
 */
export async function createBusiness(prisma: PrismaClient, input: CreateBusinessInput): Promise<CreatedBusiness> {
  await runAsSystem("platform: check new business is unique", async () => {
    const [slugTaken, loginTaken, userTaken] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: input.slug }, select: { id: true } }),
      prisma.authUser.findUnique({ where: { email: input.owner.email }, select: { id: true } }),
      prisma.user.findFirst({ where: { email: input.owner.email }, select: { id: true } }),
    ]);
    if (slugTaken) {
      throw new ConflictError({ message: "This short name is already used by another business.", details: { field: "slug" } });
    }
    if (loginTaken || userTaken) {
      throw new ConflictError({ message: "This email already has a login.", details: { field: "owner.email" } });
    }
  });

  const organizationId = randomUUID();

  try {
    return await runInOrganization(organizationId, () =>
      runTenantTransaction(prisma, async (tx: Tx) => {
        await tx.organization.create({
          data: { id: organizationId, name: input.name, slug: input.slug },
        });

        const starterKit = await applyBusinessStarterKit(tx, {
          companyName: input.name,
          businessName: input.name,
          currencyCode: input.currencyCode,
          currencySymbol: input.currencySymbol,
          timezone: input.timezone,
          email: input.owner.email,
        });

        const role = await tx.role.findUnique({ where: { name: USER_ROLES.OWNER }, select: { id: true } });
        if (role === null) {
          throw new Error("The owner role is missing; run the database seed first.");
        }

        const owner = await tx.user.create({
          data: {
            name: input.owner.name,
            email: input.owner.email,
            roleId: role.id,
            mustChangePassword: true,
          },
          select: { id: true },
        });

        const { authUserId } = await new BetterAuthCredentialGateway(tx as unknown as DbClient).createCredentialUser({
          name: input.owner.name,
          email: input.owner.email,
          password: input.owner.temporaryPassword,
          role: USER_ROLES.OWNER,
          erpUserId: owner.id,
        });
        await tx.user.update({ where: { id: owner.id }, data: { authUserId }, select: { id: true } });

        return { id: organizationId, slug: input.slug, ownerUserId: owner.id, starterKit };
      }),
    );
  } catch (error) {
    throw mapPrismaError(error);
  }
}

/**
 * Deactivates or reactivates a business. Deactivating also ends its users'
 * sessions; they cannot sign in until it is reactivated. Data is kept.
 */
export function setBusinessActive(
  prisma: PrismaClient,
  organizationId: string,
  isActive: boolean,
): Promise<{ readonly isActive: boolean; readonly sessionsEnded: number }> {
  return runAsSystem(`platform: ${isActive ? "reactivate" : "deactivate"} business`, async () => {
    const existing = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (existing === null) {
      throw new NotFoundError({ message: "Business not found." });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      // When it stopped (SaaS phase 4d: removal is allowed 30 days later).
      data: { isActive, deactivatedAt: isActive ? null : new Date() },
    });

    const sessions = isActive
      ? { count: 0 }
      : await prisma.authSession.deleteMany({ where: { user: { erpUser: { organizationId } } } });

    return { isActive, sessionsEnded: sessions.count };
  });
}

/**
 * Gives the business's first owner a new temporary password, ends their
 * sessions and makes them choose their own at next sign-in.
 */
export function resetOwnerPassword(
  prisma: PrismaClient,
  organizationId: string,
  temporaryPassword: string,
): Promise<{ readonly ownerEmail: string }> {
  return runAsSystem("platform: reset owner password", async () => {
    const owner = await prisma.user.findFirst({
      where: { organizationId, role: { name: USER_ROLES.OWNER }, authUserId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, authUserId: true },
    });

    if (owner === null || owner.authUserId === null) {
      throw new NotFoundError({ message: "This business has no owner login." });
    }

    const authUserId = owner.authUserId;
    const gateway = new BetterAuthCredentialGateway(prisma as unknown as DbClient);
    await gateway.resetCredentialPassword({ authUserId, password: temporaryPassword });
    await prisma.user.update({ where: { id: owner.id }, data: { mustChangePassword: true }, select: { id: true } });
    await gateway.revokeSessions(authUserId);

    return { ownerEmail: owner.email };
  });
}

export type BusinessPlanInput = {
  readonly planName: string | null;
  readonly maxUsers: number | null;
  readonly maxWarehouses: number | null;
};

/**
 * Sets a business's plan and limits (SaaS phase 4c). Lowering a limit below
 * current usage keeps everything that exists; it only stops adding more.
 */
export function setBusinessPlan(
  prisma: PrismaClient,
  organizationId: string,
  plan: BusinessPlanInput,
): Promise<BusinessPlanInput> {
  return runAsSystem("platform: set business plan", async () => {
    const existing = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (existing === null) {
      throw new NotFoundError({ message: "Business not found." });
    }
    return prisma.organization.update({
      where: { id: organizationId },
      data: { planName: plan.planName, maxUsers: plan.maxUsers, maxWarehouses: plan.maxWarehouses },
      select: { planName: true, maxUsers: true, maxWarehouses: true },
    });
  });
}
