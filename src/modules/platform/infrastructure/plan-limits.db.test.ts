/**
 * Plan limits and usage against a real PostgreSQL (SaaS phase 4c).
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { UnprocessableError } from "@/shared/infrastructure/errors";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { assertWithinPlanLimit } from "./plan-limits";
import { listBusinesses, setBusinessPlan } from "./platform-businesses";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const ORG = randomUUID();
const ROLE = randomUUID();
const ACTIVE_USER = randomUUID();
const INACTIVE_USER = randomUUID();
const WAREHOUSE = randomUUID();

beforeAll(async () => {
  await admin.connect();
  await admin.query(`INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $2, now())`, [ORG, `plan-${run}`]);
  await admin.query(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [ROLE, `plan-role-${run}`]);
  await admin.query(
    `INSERT INTO users (id, "organizationId", name, email, "roleId", "isActive", "lastSignInAt", "updatedAt")
     VALUES ($1, $3, 'Active', $4, $5, true, '2026-11-18T09:00:00Z', now()),
            ($2, $3, 'Inactive', $6, $5, false, null, now())`,
    [ACTIVE_USER, INACTIVE_USER, ORG, `active-${run}@rentcore.test`, ROLE, `inactive-${run}@rentcore.test`],
  );
  await admin.query(
    `INSERT INTO warehouses (id, "organizationId", "warehouseCode", name, "updatedAt") VALUES ($1, $2, $3, 'Store', now())`,
    [WAREHOUSE, ORG, `PLAN-${run}`],
  );
});

afterAll(async () => {
  await admin.query(`DELETE FROM warehouses WHERE "organizationId" = $1`, [ORG]);
  await admin.query(`DELETE FROM users WHERE "organizationId" = $1`, [ORG]);
  await admin.query(`DELETE FROM roles WHERE id = $1`, [ROLE]);
  await admin.query(`DELETE FROM organizations WHERE id = $1`, [ORG]);
  await admin.end();
  await prisma.$disconnect();
});

const within = (resource: "users" | "warehouses") => runInOrganization(ORG, () => assertWithinPlanLimit(resource));

describe("plan limits", () => {
  it("allows anything while the business has no limits", async () => {
    await expect(within("users")).resolves.toBeUndefined();
    await expect(within("warehouses")).resolves.toBeUndefined();
  });

  it("refuses going past a limit, counting only active users", async () => {
    await setBusinessPlan(prisma, ORG, { planName: "Pilot", maxUsers: 1, maxWarehouses: 2 });

    // 1 active (the inactive one does not count): adding one more would be 2.
    await expect(within("users")).rejects.toBeInstanceOf(UnprocessableError);
    await expect(within("users")).rejects.toThrow("up to 1 active user.");
    await expect(within("warehouses")).resolves.toBeUndefined();

    await setBusinessPlan(prisma, ORG, { planName: "Pilot", maxUsers: 2, maxWarehouses: 1 });
    await expect(within("users")).resolves.toBeUndefined();
    await expect(within("warehouses")).rejects.toThrow("up to 1 active warehouse.");
  });

  it("shows the plan, usage and last sign-in to the platform owner", async () => {
    await setBusinessPlan(prisma, ORG, { planName: "Standard", maxUsers: 5, maxWarehouses: null });
    const business = (await listBusinesses(prisma)).find((row) => row.id === ORG);

    expect(business).toMatchObject({
      plan: { name: "Standard", maxUsers: 5, maxWarehouses: null },
      users: 2,
      activeUsers: 1,
      activeWarehouses: 1,
      lastSignInAt: "2026-11-18T09:00:00.000Z",
    });
  });
});
