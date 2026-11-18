/**
 * Platform business operations against a real PostgreSQL (SaaS phase 3c).
 * Run with `npm run test:db` and a migrated, disposable DATABASE_URL.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { CreateBusinessInput } from "../application/platform-business.schemas";
import { createBusiness, listBusinesses, resetOwnerPassword, setBusinessActive } from "./platform-businesses";
import { getBusinessSetupStatus } from "./provision-business";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const createdOrganizations: string[] = [];
const ownerEmails: string[] = [];
let insertedOwnerRole = false;

const TENANT_TABLES = [
  "document_sequences",
  "accounts",
  "units_of_measure",
  "expense_categories",
  "company_settings",
  "users",
];

function input(suffix: string): CreateBusinessInput {
  const email = `owner-${suffix}-${run}@rentcore.test`;
  ownerEmails.push(email);
  return {
    name: `Platform Test ${suffix}`,
    slug: `pt-${suffix}-${run}`,
    currencyCode: "PKR",
    currencySymbol: "Rs",
    timezone: "Asia/Karachi",
    owner: { name: `Owner ${suffix}`, email, temporaryPassword: "temporary-pass-123" },
  };
}

beforeAll(async () => {
  await admin.connect();
  const role = await admin.query(
    `INSERT INTO roles (id, name) VALUES ($1, 'owner') ON CONFLICT (name) DO NOTHING RETURNING id`,
    [randomUUID()],
  );
  insertedOwnerRole = role.rowCount === 1;
});

afterAll(async () => {
  const { rows } = await admin.query(`SELECT id FROM organizations WHERE slug LIKE $1`, [`pt-%-${run}`]);
  const ids = [...new Set([...createdOrganizations, ...rows.map((row) => row.id as string)])];
  await admin.query(`DELETE FROM "user" WHERE email = ANY($1)`, [ownerEmails]);
  for (const table of TENANT_TABLES) {
    await admin.query(`DELETE FROM ${table} WHERE "organizationId" = ANY($1::uuid[])`, [ids]);
  }
  await admin.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [ids]);
  if (insertedOwnerRole) await admin.query(`DELETE FROM roles WHERE name = 'owner'`);
  await admin.end();
  await prisma.$disconnect();
});

describe("createBusiness", () => {
  it("creates a ready business with an owner who must change the password", async () => {
    const created = await createBusiness(prisma, input("a"));
    createdOrganizations.push(created.id);

    expect((await getBusinessSetupStatus(prisma, created.id)).ready).toBe(true);

    const { rows: owners } = await admin.query(
      `SELECT u."organizationId", u."mustChangePassword", a.role, a."erpUserId" = u.id AS linked,
              (SELECT count(*) FROM account c WHERE c."userId" = a.id AND c."providerId" = 'credential') AS credentials
       FROM users u JOIN "user" a ON a.id = u."authUserId" WHERE u.id = $1`,
      [created.ownerUserId],
    );
    expect(owners).toEqual([
      { organizationId: created.id, mustChangePassword: true, role: "owner", linked: true, credentials: "1" },
    ]);

    const listed = (await listBusinesses(prisma)).find((business) => business.id === created.id);
    expect(listed).toMatchObject({ isActive: true, users: 1, rentalOrders: 0, owner: { email: ownerEmails[0] } });
  });

  it("refuses a short name or email that is already used", async () => {
    const first = input("b");
    const created = await createBusiness(prisma, first);
    createdOrganizations.push(created.id);

    await expect(createBusiness(prisma, { ...input("c"), slug: first.slug })).rejects.toBeInstanceOf(ConflictError);
    await expect(
      createBusiness(prisma, { ...input("d"), owner: { ...first.owner } }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("leaves nothing behind when a step fails (all or nothing)", async () => {
    const attempt = input("e");
    await admin.query(`UPDATE roles SET name = $1 WHERE name = 'owner'`, [`owner-hidden-${run}`]);
    try {
      await expect(createBusiness(prisma, attempt)).rejects.toThrow(/owner role is missing/);
    } finally {
      await admin.query(`UPDATE roles SET name = 'owner' WHERE name = $1`, [`owner-hidden-${run}`]);
    }

    const { rows } = await admin.query(`SELECT count(*)::int AS n FROM organizations WHERE slug = $1`, [attempt.slug]);
    expect(rows[0].n).toBe(0);
  });
});

describe("deactivate, reactivate and reset the owner's password", () => {
  let organizationId = "";
  let authUserId = "";

  beforeAll(async () => {
    const created = await createBusiness(prisma, input("f"));
    organizationId = created.id;
    createdOrganizations.push(created.id);
    const { rows } = await admin.query(`SELECT "authUserId" FROM users WHERE id = $1`, [created.ownerUserId]);
    authUserId = rows[0].authUserId;
  });

  async function addSession(): Promise<void> {
    await admin.query(
      `INSERT INTO session (id, "expiresAt", token, "userId", "updatedAt") VALUES ($1, now() + interval '1 day', $2, $3, now())`,
      [randomUUID(), randomUUID(), authUserId],
    );
  }

  async function sessionCount(): Promise<number> {
    const { rows } = await admin.query(`SELECT count(*)::int AS n FROM session WHERE "userId" = $1`, [authUserId]);
    return rows[0].n;
  }

  it("signs the business's users out when deactivating, keeps data, and reactivates", async () => {
    await addSession();

    await expect(setBusinessActive(prisma, organizationId, false)).resolves.toEqual({
      isActive: false,
      sessionsEnded: 1,
    });
    expect(await sessionCount()).toBe(0);
    expect((await getBusinessSetupStatus(prisma, organizationId)).ready).toBe(true);

    await expect(setBusinessActive(prisma, organizationId, true)).resolves.toMatchObject({ isActive: true });
  });

  it("gives the owner a new temporary password and signs them out", async () => {
    await admin.query(`UPDATE users SET "mustChangePassword" = false WHERE "authUserId" = $1`, [authUserId]);
    const before = await admin.query(`SELECT password FROM account WHERE "userId" = $1`, [authUserId]);
    await addSession();

    await resetOwnerPassword(prisma, organizationId, "another-temp-456");

    const after = await admin.query(
      `SELECT c.password, u."mustChangePassword" FROM account c JOIN users u ON u."authUserId" = c."userId" WHERE c."userId" = $1`,
      [authUserId],
    );
    expect(after.rows[0].password).not.toBe(before.rows[0].password);
    expect(after.rows[0].mustChangePassword).toBe(true);
    expect(await sessionCount()).toBe(0);
  });
});
