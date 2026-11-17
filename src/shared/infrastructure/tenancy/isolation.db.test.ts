/**
 * Two-business isolation against a real PostgreSQL (SaaS phase 2c/2d).
 * Run with `npm run test:db` and a migrated, disposable DATABASE_URL.
 * It creates two throwaway businesses and removes them afterwards.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";

import { runAsSystem, runInOrganization } from "./organization-scope";
import { TenantTransactionError, runTenantTransaction } from "./rls-session";

const prisma = createPrismaClient();
// A plain connection without the app marker: like migrations and backups,
// it is not restricted by row-level security.
const admin = new Client({ connectionString: process.env.DATABASE_URL });

const run = randomUUID().slice(0, 8);
const X = randomUUID();
const Y = randomUUID();
const ids = {
  x: { customer: randomUUID(), warehouse: randomUUID(), product: randomUUID() },
  y: { customer: randomUUID(), warehouse: randomUUID(), product: randomUUID() },
};

async function seedBusiness(org: string, slug: string, row: (typeof ids)["x"]) {
  await admin.query(
    `INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())`,
    [org, `Isolation ${slug}`, `isolation-${slug}-${run}`],
  );
  await admin.query(
    `INSERT INTO customers (id, "organizationId", "customerCode", name, phone, address, "updatedAt")
     VALUES ($1, $2, $3, 'Customer', '0300', 'Road', now())`,
    [row.customer, org, `ISO-${slug}-${run}`],
  );
  await admin.query(
    `INSERT INTO warehouses (id, "organizationId", "warehouseCode", name, "updatedAt")
     VALUES ($1, $2, $3, 'Store', now())`,
    [row.warehouse, org, `ISO-${slug}-${run}`],
  );
  await admin.query(
    `INSERT INTO products (id, "organizationId", "productCode", name, "purchaseCost", "rentalPricePerDay", unit, "updatedAt")
     VALUES ($1, $2, $3, 'Chair', 1, 1, 'pcs', now())`,
    [row.product, org, `ISO-${slug}-${run}`],
  );
}

beforeAll(async () => {
  await admin.connect();
  const { rows } = await admin.query(
    "SELECT rolsuper OR rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user",
  );
  if (rows[0]?.bypass) {
    throw new Error("test:db must connect as a non-superuser role: superusers skip row-level security");
  }
  await seedBusiness(X, "x", ids.x);
  await seedBusiness(Y, "y", ids.y);
});

afterAll(async () => {
  for (const table of ["inventory", "customers", "warehouses", "products"]) {
    await admin.query(`DELETE FROM ${table} WHERE "organizationId" = ANY($1::uuid[])`, [[X, Y]]);
  }
  await admin.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [[X, Y]]);
  await admin.end();
  await prisma.$disconnect();
});

describe("model queries (tenant guard + row-level security)", () => {
  it("lists only the current business's rows", async () => {
    const rows = await runInOrganization(X, () =>
      prisma.customer.findMany({ where: { id: { in: [ids.x.customer, ids.y.customer] } } }),
    );
    expect(rows.map((row) => row.id)).toEqual([ids.x.customer]);
  });

  it("stamps the current business on a create", async () => {
    const created = await runInOrganization(X, () =>
      prisma.warehouse.create({ data: { warehouseCode: `ISO-x2-${run}`, name: "Second" } }),
    );
    expect(created.organizationId).toBe(X);
  });
});

describe("raw SQL (row-level security only)", () => {
  it("cannot read another business's row", async () => {
    const rows = await runInOrganization(X, () =>
      prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM customers WHERE id = ${ids.y.customer}::uuid`,
    );
    expect(rows).toEqual([]);
  });

  it("cannot update another business's row", async () => {
    const changed = await runInOrganization(X, () =>
      prisma.$executeRaw`UPDATE customers SET notes = 'x' WHERE id = ${ids.y.customer}::uuid`,
    );
    expect(changed).toBe(0);
  });

  it("cannot move a row into another business", async () => {
    await expect(
      runInOrganization(X, () =>
        prisma.$executeRaw`UPDATE customers SET "organizationId" = ${Y}::uuid WHERE id = ${ids.x.customer}::uuid`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("sees nothing at all without a business (fails closed)", async () => {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM customers`;
    expect(Number(rows[0]?.count)).toBe(0);
  });

  it("lets explicit system code see every business", async () => {
    const rows = await runAsSystem("isolation test", () =>
      prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM customers WHERE id IN (${ids.x.customer}::uuid, ${ids.y.customer}::uuid)`,
    );
    expect(rows).toHaveLength(2);
  });

  it("gives a raw insert the current business by default", async () => {
    const id = randomUUID();
    await runInOrganization(Y, () =>
      prisma.$executeRaw`INSERT INTO warehouses (id, "warehouseCode", name, "updatedAt") VALUES (${id}::uuid, ${`ISO-y2-${run}`}, 'Raw', now())`,
    );
    const { rows } = await admin.query(`SELECT "organizationId" FROM warehouses WHERE id = $1`, [id]);
    expect(rows[0]?.organizationId).toBe(Y);
  });

  it("refuses a write that has no business instead of defaulting to the first one", async () => {
    await expect(
      runAsSystem("isolation test", () =>
        prisma.$executeRaw`INSERT INTO warehouses (id, "warehouseCode", name, "updatedAt") VALUES (${randomUUID()}::uuid, ${`ISO-none-${run}`}, 'None', now())`,
      ),
    ).rejects.toThrow(/organizationId|null value/);
  });
});

describe("cross-business links", () => {
  it("refuses stock that points at another business's product and warehouse", async () => {
    await expect(
      runInOrganization(X, () =>
        prisma.$executeRaw`INSERT INTO inventory (id, "productId", "warehouseId", "quantityOnHand", "updatedAt")
                           VALUES (${randomUUID()}::uuid, ${ids.y.product}::uuid, ${ids.y.warehouse}::uuid, 1, now())`,
      ),
    ).rejects.toThrow(/RENTCORE_CROSS_ORGANIZATION_REFERENCE/);
  });

  it("accepts stock for the business's own product and warehouse", async () => {
    const changed = await runInOrganization(X, () =>
      prisma.$executeRaw`INSERT INTO inventory (id, "productId", "warehouseId", "quantityOnHand", "updatedAt")
                         VALUES (${randomUUID()}::uuid, ${ids.x.product}::uuid, ${ids.x.warehouse}::uuid, 1, now())`,
    );
    expect(changed).toBe(1);
  });
});

describe("transactions", () => {
  it("applies the business inside runTenantTransaction", async () => {
    const rows = await runInOrganization(X, () =>
      runTenantTransaction(prisma, (tx) =>
        tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM customers WHERE id IN (${ids.x.customer}::uuid, ${ids.y.customer}::uuid)`,
      ),
    );
    expect(rows.map((row) => row.id)).toEqual([ids.x.customer]);
  });

  it("refuses business data in a transaction started another way (Prisma internals contract)", async () => {
    await expect(
      runInOrganization(X, () => prisma.$transaction((tx) => tx.customer.count())),
    ).rejects.toThrow(TenantTransactionError);
  });

  it("does not leak the business to the next query on a pooled connection", async () => {
    await runInOrganization(X, () => prisma.customer.count());
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM customers`;
    expect(Number(rows[0]?.count)).toBe(0);
  });
});
