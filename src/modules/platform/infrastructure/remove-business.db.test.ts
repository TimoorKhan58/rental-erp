/**
 * Removing a business against a real PostgreSQL (SaaS phase 4d): every row
 * of that business goes, nothing of any other business is touched.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { ConflictError, UnprocessableError } from "@/shared/infrastructure/errors";

import { createBusiness, setBusinessActive } from "./platform-businesses";
import { removeBusiness } from "./remove-business";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const OWNER_LOGIN = `po-remove-${run}`;
let platformOwnerId = "";
let insertedOwnerRole = false;
const businesses: Record<"leaving" | "staying", { id: string; slug: string; email: string }> = {
  leaving: { id: "", slug: `leaving-${run}`, email: `leaving-${run}@rentcore.test` },
  staying: { id: "", slug: `staying-${run}`, email: `staying-${run}@rentcore.test` },
};

async function tenantCounts(organizationId: string): Promise<Record<string, number>> {
  const { rows: tables } = await admin.query(
    `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'organizationId'`,
  );
  const counts: Record<string, number> = {};
  for (const { table_name } of tables) {
    const { rows } = await admin.query(`SELECT count(*)::int AS n FROM "${table_name}" WHERE "organizationId" = $1`, [organizationId]);
    counts[table_name] = rows[0].n;
  }
  return counts;
}

async function addOperationalData(organizationId: string): Promise<void> {
  const [customer, warehouse, product] = [randomUUID(), randomUUID(), randomUUID()];
  await admin.query(
    `INSERT INTO customers (id, "organizationId", "customerCode", name, phone, address, "updatedAt") VALUES ($1, $2, $3, 'C', '0300', 'R', now())`,
    [customer, organizationId, `RM-${run}`],
  );
  await admin.query(
    `INSERT INTO warehouses (id, "organizationId", "warehouseCode", name, "updatedAt") VALUES ($1, $2, $3, 'W', now())`,
    [warehouse, organizationId, `RM-${run}`],
  );
  await admin.query(
    `INSERT INTO products (id, "organizationId", "productCode", name, "purchaseCost", "rentalPricePerDay", unit, "updatedAt")
     VALUES ($1, $2, $3, 'P', 1, 1, 'pcs', now())`,
    [product, organizationId, `RM-${run}`],
  );
  await admin.query(
    `INSERT INTO inventory (id, "organizationId", "productId", "warehouseId", "quantityOnHand", "updatedAt") VALUES ($1, $2, $3, $4, 5, now())`,
    [randomUUID(), organizationId, product, warehouse],
  );
}

async function prepareForRemoval(organizationId: string): Promise<void> {
  await setBusinessActive(prisma, organizationId, false);
  await admin.query(`UPDATE organizations SET "deactivatedAt" = now() - interval '31 days' WHERE id = $1`, [organizationId]);
  await admin.query(
    `INSERT INTO platform_audit_logs (id, "platformOwnerId", action, "targetOrganizationId") VALUES ($1, $2, 'business.exported', $3)`,
    [randomUUID(), platformOwnerId, organizationId],
  );
}

beforeAll(async () => {
  await admin.connect();
  const role = await admin.query(`INSERT INTO roles (id, name) VALUES ($1, 'owner') ON CONFLICT (name) DO NOTHING RETURNING id`, [randomUUID()]);
  insertedOwnerRole = role.rowCount === 1;
  await admin.query(`INSERT INTO "user" (id, name, email, role, "updatedAt") VALUES ($1, 'PO', $2, 'platform_owner', now())`, [
    OWNER_LOGIN,
    `${OWNER_LOGIN}@rentcore.test`,
  ]);
  const owner = await admin.query(`INSERT INTO platform_owners (id, "authUserId", "updatedAt") VALUES ($1, $2, now()) RETURNING id`, [
    randomUUID(),
    OWNER_LOGIN,
  ]);
  platformOwnerId = owner.rows[0].id;

  for (const business of Object.values(businesses)) {
    const created = await createBusiness(prisma, {
      name: business.slug,
      slug: business.slug,
      currencyCode: "PKR",
      currencySymbol: "Rs",
      timezone: "Asia/Karachi",
      owner: { name: "Owner", email: business.email, temporaryPassword: "temporary-pass-123" },
    });
    business.id = created.id;
    await addOperationalData(created.id);
  }
});

afterAll(async () => {
  const staying = businesses.staying.id;
  for (const table of ["inventory", "products", "warehouses", "customers", "document_sequences", "accounts", "units_of_measure", "expense_categories", "company_settings", "users"]) {
    await admin.query(`DELETE FROM "${table}" WHERE "organizationId" = $1`, [staying]);
  }
  await admin.query(`DELETE FROM "user" WHERE email = ANY($1)`, [[businesses.leaving.email, businesses.staying.email]]);
  await admin.query(`DELETE FROM organizations WHERE id = $1`, [staying]);
  await admin.query(`DELETE FROM platform_audit_logs WHERE "platformOwnerId" = $1`, [platformOwnerId]);
  await admin.query(`DELETE FROM "user" WHERE id = $1`, [OWNER_LOGIN]);
  if (insertedOwnerRole) await admin.query(`DELETE FROM roles WHERE name = 'owner'`);
  await admin.end();
  await prisma.$disconnect();
});

const remove = (overrides: Partial<{ confirmSlug: string; backupConfirmed: boolean }> = {}) =>
  removeBusiness(prisma, {
    organizationId: businesses.leaving.id,
    confirmSlug: businesses.leaving.slug,
    backupConfirmed: true,
    platformOwnerId,
    ...overrides,
  });

describe("removeBusiness", () => {
  it("refuses while the business is active or deactivated less than 30 days ago", async () => {
    await expect(remove()).rejects.toBeInstanceOf(ConflictError);
    await setBusinessActive(prisma, businesses.leaving.id, false);
    await expect(remove()).rejects.toThrow(/30 days/);
  });

  it("refuses a wrong short name or a missing backup confirmation", async () => {
    await prepareForRemoval(businesses.leaving.id);
    await expect(remove({ confirmSlug: "something-else" })).rejects.toBeInstanceOf(UnprocessableError);
    await expect(remove({ backupConfirmed: false })).rejects.toBeInstanceOf(UnprocessableError);
  });

  it("removes every record and login of that business and nothing else", async () => {
    const stayingBefore = await tenantCounts(businesses.staying.id);
    const leavingBefore = await tenantCounts(businesses.leaving.id);
    const expectedRecords = Object.values(leavingBefore).reduce((sum, n) => sum + n, 0);

    const removed = await remove();

    expect(removed).toMatchObject({ slug: businesses.leaving.slug, removedRecords: expectedRecords, removedLogins: 1 });
    expect(Object.values(await tenantCounts(businesses.leaving.id)).every((n) => n === 0)).toBe(true);
    expect(await tenantCounts(businesses.staying.id)).toEqual(stayingBefore);

    const org = await admin.query(`SELECT 1 FROM organizations WHERE id = $1`, [businesses.leaving.id]);
    expect(org.rowCount).toBe(0);
    const login = await admin.query(`SELECT 1 FROM "user" WHERE email = $1`, [businesses.leaving.email]);
    expect(login.rowCount).toBe(0);
    const stayingLogin = await admin.query(`SELECT 1 FROM "user" WHERE email = $1`, [businesses.staying.email]);
    expect(stayingLogin.rowCount).toBe(1);

    const audit = await admin.query(
      `SELECT details FROM platform_audit_logs WHERE action = 'business.removed' AND "targetOrganizationId" = $1`,
      [businesses.leaving.id],
    );
    expect(audit.rows[0]?.details).toMatchObject({ slug: businesses.leaving.slug, removedRecords: expectedRecords });
  });
});
