import prisma from "@/lib/prisma";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

/**
 * Plan limits per business (SaaS phase 4c). The platform owner sets them on
 * the business (null = no limit). Only *active* users and warehouses count,
 * so deactivating one frees a place.
 */
export type PlanResource = "users" | "warehouses";

const LABEL: Record<PlanResource, { one: string; many: string }> = {
  users: { one: "active user", many: "active users" },
  warehouses: { one: "active warehouse", many: "active warehouses" },
};

export function planLimitMessage(resource: PlanResource, limit: number): string {
  const label = limit === 1 ? LABEL[resource].one : LABEL[resource].many;
  return (
    `Your plan allows up to ${limit} ${label}. ` +
    `Deactivate one first, or ask RentCore to raise your limit.`
  );
}

/** Pure decision, unit tested. */
export function exceedsPlanLimit(limit: number | null, current: number, adding = 1): boolean {
  return limit !== null && current + adding > limit;
}

/**
 * Refuses adding (or reactivating) a user or warehouse beyond the current
 * business's plan. Without a business scope (platform code, the bootstrap
 * script, unit tests) there is nothing to limit.
 */
export async function assertWithinPlanLimit(resource: PlanResource, adding = 1): Promise<void> {
  const scope = getOrganizationScope();
  if (scope?.kind !== "organization") return;

  const organization = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { maxUsers: true, maxWarehouses: true },
  });
  const limit = resource === "users" ? organization?.maxUsers ?? null : organization?.maxWarehouses ?? null;
  if (limit === null) return;

  const current =
    resource === "users"
      ? await prisma.user.count({ where: { isActive: true } })
      : await prisma.warehouse.count({ where: { isActive: true } });

  if (exceedsPlanLimit(limit, current, adding)) {
    throw new UnprocessableError({
      message: planLimitMessage(resource, limit),
      details: { reason: "PLAN_LIMIT", resource, limit, current },
    });
  }
}
