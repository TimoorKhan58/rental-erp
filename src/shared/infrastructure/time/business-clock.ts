import { APPLICATION } from "@/constants/application";
import prisma from "@/lib/prisma";
import { getOrganizationScope } from "@/shared/infrastructure/tenancy/organization-scope";

import { businessDay, isValidTimeZone } from "./business-day";

/**
 * The current business's time zone and "today" (SaaS phase 4a).
 *
 * The time zone comes from the business's active company settings and is
 * remembered for a few minutes per business. Without a business scope
 * (platform code, unit tests) the application default is used.
 */
const CACHE_MS = 5 * 60_000;

const globalForClock = globalThis as unknown as {
  rentcoreTimeZones?: Map<string, { timeZone: string; expiresAt: number }>;
};
const cache = (globalForClock.rentcoreTimeZones ??= new Map());

export async function getBusinessTimeZone(): Promise<string> {
  const scope = getOrganizationScope();
  if (scope?.kind !== "organization") {
    return APPLICATION.timezone;
  }

  const cached = cache.get(scope.organizationId);
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    return cached.timeZone;
  }

  const settings = await prisma.companySetting.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { timezone: true },
  });
  const timeZone =
    settings !== null && isValidTimeZone(settings.timezone) ? settings.timezone : APPLICATION.timezone;

  cache.set(scope.organizationId, { timeZone, expiresAt: Date.now() + CACHE_MS });
  return timeZone;
}

/** Today for the current business, as midnight UTC of its local date. */
export async function getBusinessToday(now: Date = new Date()): Promise<Date> {
  return businessDay(await getBusinessTimeZone(), now);
}

/** Forget a business's cached time zone (after its settings change). */
export function forgetBusinessTimeZone(organizationId: string): void {
  cache.delete(organizationId);
}
