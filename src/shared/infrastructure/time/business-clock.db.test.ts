/**
 * Business clock against a real PostgreSQL (SaaS phase 4a): each business's
 * own time zone is read through the tenant guard and row-level security.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { provisionBusinessStarterKit } from "@/modules/platform/infrastructure/provision-business";
import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { forgetBusinessTimeZone, getBusinessToday } from "./business-clock";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const run = randomUUID().slice(0, 8);
const KARACHI_ORG = randomUUID();
const NEW_YORK_ORG = randomUUID();
const TABLES = ["document_sequences", "accounts", "units_of_measure", "expense_categories", "company_settings"];

// 18 Nov 2026 00:30 in Karachi; still 17 Nov in New York.
const NOW = new Date("2026-11-17T19:30:00Z");

beforeAll(async () => {
  await admin.connect();
  for (const [id, slug] of [
    [KARACHI_ORG, `clock-khi-${run}`],
    [NEW_YORK_ORG, `clock-nyc-${run}`],
  ]) {
    await admin.query(`INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $2, now())`, [id, slug]);
  }
  await provisionBusinessStarterKit(prisma, KARACHI_ORG, { companyName: "Karachi", timezone: "Asia/Karachi" });
  await provisionBusinessStarterKit(prisma, NEW_YORK_ORG, { companyName: "New York", timezone: "America/New_York" });
});

afterAll(async () => {
  for (const table of TABLES) {
    await admin.query(`DELETE FROM ${table} WHERE "organizationId" = ANY($1::uuid[])`, [[KARACHI_ORG, NEW_YORK_ORG]]);
  }
  await admin.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [[KARACHI_ORG, NEW_YORK_ORG]]);
  await admin.end();
  await prisma.$disconnect();
});

describe("each business's own today", () => {
  it("reads each business's time zone from its own settings", async () => {
    forgetBusinessTimeZone(KARACHI_ORG);
    forgetBusinessTimeZone(NEW_YORK_ORG);

    await expect(runInOrganization(KARACHI_ORG, () => getBusinessToday(NOW))).resolves.toEqual(
      new Date("2026-11-18T00:00:00Z"),
    );
    await expect(runInOrganization(NEW_YORK_ORG, () => getBusinessToday(NOW))).resolves.toEqual(
      new Date("2026-11-17T00:00:00Z"),
    );
  });
});
