import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";

/** Mirrors PlatformBusinessSummary (src/modules/platform). */
export type PlatformBusiness = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string } | null;
  users: number;
  rentalOrders: number;
  lastOrderAt: string | null;
  plan: BusinessPlan;
  activeUsers: number;
  activeWarehouses: number;
  lastSignInAt: string | null;
  deactivatedAt: string | null;
  lastExportAt: string | null;
  removal: { allowed: boolean; reasons: string[]; allowedFrom: string | null };
};

/** null limits mean "no limit". */
export type BusinessPlan = { name: string | null; maxUsers: number | null; maxWarehouses: number | null };

export type CreateBusinessPayload = {
  name: string;
  slug: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  owner: { name: string; email: string; temporaryPassword: string };
};

export const platformBusinessesKey = ["platform", "businesses"] as const;

export const getBusinesses = () => apiGet<PlatformBusiness[]>("/platform/businesses");

export const createBusiness = (payload: CreateBusinessPayload) =>
  apiPost<{ id: string; slug: string }>("/platform/businesses", payload);

export const setBusinessActive = (id: string, isActive: boolean) =>
  apiPatch<{ isActive: boolean; sessionsEnded: number }>(`/platform/businesses/${id}`, { isActive });

export const resetOwnerPassword = (id: string, temporaryPassword: string) =>
  apiPost<{ ownerEmail: string }>(`/platform/businesses/${id}/owner-password`, { temporaryPassword });

/** A readable temporary password (no look-alike characters). */
export function generateTemporaryPassword(length = 14): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

/** "Test Tents B" -> "test-tents-b". */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const setBusinessPlan = (id: string, plan: { planName: string | null; maxUsers: number | null; maxWarehouses: number | null }) =>
  apiPut<{ planName: string | null; maxUsers: number | null; maxWarehouses: number | null }>(
    `/platform/businesses/${id}/plan`,
    plan,
  );

export const removeBusiness = (id: string, confirmSlug: string) =>
  apiPost<{ removedRecords: number; removedLogins: number }>(`/platform/businesses/${id}/remove`, {
    confirmSlug,
    backupConfirmed: true,
  });
