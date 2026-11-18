/**
 * Business export against a real PostgreSQL (SaaS phase 4b): an export holds
 * exactly that business's records and nothing of any other business.
 */
import { randomUUID } from "node:crypto";

import { strFromU8, unzipSync } from "fflate";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { TENANT_MODELS } from "@/shared/infrastructure/tenancy/tenant-model-map";

import { buildBusinessExport } from "./business-export";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const A = randomUUID();
const B = randomUUID();
const CUSTOMER_A = randomUUID();
const CUSTOMER_B = randomUUID();

beforeAll(async () => {
  await admin.connect();
  for (const [org, slug, customer, name] of [
    [A, `export-a-${run}`, CUSTOMER_A, "Alpha, Customer"],
    [B, `export-b-${run}`, CUSTOMER_B, "Bravo Secret Customer"],
  ]) {
    await admin.query(`INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $2, now())`, [org, slug]);
    await admin.query(
      `INSERT INTO customers (id, "organizationId", "customerCode", name, phone, address, "updatedAt")
       VALUES ($1, $2, $3, $4, '0300', 'Road', now())`,
      [customer, org, `EXP-${run}`, name],
    );
  }
});

afterAll(async () => {
  await admin.query(`DELETE FROM customers WHERE "organizationId" = ANY($1::uuid[])`, [[A, B]]);
  await admin.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [[A, B]]);
  await admin.end();
  await prisma.$disconnect();
});

describe("buildBusinessExport", () => {
  it("is a valid zip with a manifest, a readme and one CSV per record type", async () => {
    const exported = await buildBusinessExport(prisma, A, new Date("2026-11-18T10:00:00Z"));
    const files = unzipSync(exported.data);

    expect(exported.fileName).toBe(`rentcore-export-a-${run}-2026-11-18.zip`);
    expect(Object.keys(files)).toContain("manifest.json");
    expect(Object.keys(files)).toContain("README.txt");
    for (const model of TENANT_MODELS) {
      expect(Object.keys(files)).toContain(`data/${model}.csv`);
    }
    expect(Object.keys(files).filter((name) => name.startsWith("data/"))).toHaveLength(TENANT_MODELS.size);

    const manifest = JSON.parse(strFromU8(files["manifest.json"]!));
    expect(manifest.recordCounts.Customer).toBe(1);
    expect(manifest.totalRecords).toBe(exported.totalRecords);
  });

  it("contains only that business's records", async () => {
    const files = unzipSync((await buildBusinessExport(prisma, A)).data);
    const customers = strFromU8(files["data/Customer.csv"]!);

    expect(customers).toContain('"Alpha, Customer"');
    expect(customers).toContain(CUSTOMER_A);
    expect(customers).not.toContain(CUSTOMER_B);
    expect(customers).not.toContain("Bravo Secret Customer");

    const everything = Object.values(files).map((file) => strFromU8(file)).join("\n");
    expect(everything).not.toContain(B);
  });

  it("never includes logins, passwords or sessions", async () => {
    const names = Object.keys(unzipSync((await buildBusinessExport(prisma, A)).data));
    for (const platformTable of ["AuthUser", "AuthAccount", "AuthSession", "PlatformOwner", "PlatformAuditLog", "Organization"]) {
      expect(names).not.toContain(`data/${platformTable}.csv`);
    }
  });
});
