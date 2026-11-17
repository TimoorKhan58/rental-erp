/**
 * Platform owners against a real PostgreSQL (SaaS phase 3b).
 * Run with `npm run test:db` and a migrated, disposable DATABASE_URL.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";

import { findActivePlatformOwner, recordPlatformAudit } from "./platform-owner.repository";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const OWNER_LOGIN = `po-${run}`;
const BUSINESS_LOGIN = `biz-${run}`;
const ORG = randomUUID();
const ERP_USER = randomUUID();
const ROLE = randomUUID();
let ownerId = "";

beforeAll(async () => {
  await admin.connect();
  await admin.query(
    `INSERT INTO "user" (id, name, email, role, "updatedAt") VALUES ($1, 'Platform Owner', $2, 'platform_owner', now())`,
    [OWNER_LOGIN, `${OWNER_LOGIN}@rentcore.test`],
  );
  const owner = await admin.query(
    `INSERT INTO platform_owners (id, "authUserId", "updatedAt") VALUES ($1, $2, now()) RETURNING id`,
    [randomUUID(), OWNER_LOGIN],
  );
  ownerId = owner.rows[0].id;

  // A business login that (wrongly) also has a platform owner row.
  await admin.query(
    `INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, 'PO test', $2, now())`,
    [ORG, `po-test-${run}`],
  );
  await admin.query(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [ROLE, `po-test-${run}`]);
  await admin.query(
    `INSERT INTO users (id, "organizationId", name, email, "roleId", "updatedAt") VALUES ($1, $2, 'Biz', $3, $4, now())`,
    [ERP_USER, ORG, `${BUSINESS_LOGIN}@rentcore.test`, ROLE],
  );
  await admin.query(
    `INSERT INTO "user" (id, name, email, role, "erpUserId", "updatedAt") VALUES ($1, 'Biz', $2, 'owner', $3, now())`,
    [BUSINESS_LOGIN, `${BUSINESS_LOGIN}-auth@rentcore.test`, ERP_USER],
  );
  await admin.query(
    `INSERT INTO platform_owners (id, "authUserId", "updatedAt") VALUES ($1, $2, now())`,
    [randomUUID(), BUSINESS_LOGIN],
  );
});

afterAll(async () => {
  await admin.query(`DELETE FROM platform_audit_logs WHERE "platformOwnerId" = $1`, [ownerId]);
  await admin.query(`DELETE FROM "user" WHERE id = ANY($1)`, [[OWNER_LOGIN, BUSINESS_LOGIN]]);
  await admin.query(`DELETE FROM users WHERE id = $1`, [ERP_USER]);
  await admin.query(`DELETE FROM roles WHERE id = $1`, [ROLE]);
  await admin.query(`DELETE FROM organizations WHERE id = $1`, [ORG]);
  await admin.end();
  await prisma.$disconnect();
});

describe("platform owners", () => {
  it("finds an active platform owner from the app's connection without a business", async () => {
    await expect(findActivePlatformOwner(prisma, OWNER_LOGIN)).resolves.toMatchObject({
      id: ownerId,
      email: `${OWNER_LOGIN}@rentcore.test`,
    });
  });

  it("never treats a business login as a platform owner", async () => {
    await expect(findActivePlatformOwner(prisma, BUSINESS_LOGIN)).resolves.toBeNull();
  });

  it("ignores a deactivated platform owner", async () => {
    await admin.query(`UPDATE platform_owners SET "isActive" = false WHERE id = $1`, [ownerId]);
    await expect(findActivePlatformOwner(prisma, OWNER_LOGIN)).resolves.toBeNull();
    await admin.query(`UPDATE platform_owners SET "isActive" = true WHERE id = $1`, [ownerId]);
  });

  it("records platform audit rows", async () => {
    await recordPlatformAudit(prisma, {
      platformOwnerId: ownerId,
      action: "platform.sign_in",
      targetOrganizationId: ORG,
      details: { note: "db test" },
    });
    const { rows } = await admin.query(
      `SELECT action, "targetOrganizationId" FROM platform_audit_logs WHERE "platformOwnerId" = $1`,
      [ownerId],
    );
    expect(rows).toEqual([{ action: "platform.sign_in", targetOrganizationId: ORG }]);
  });
});
