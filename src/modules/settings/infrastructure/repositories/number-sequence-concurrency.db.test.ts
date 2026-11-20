/**
 * Document numbers against a real PostgreSQL: staff saving at the same moment
 * must each get their own number (QA load test L1 found duplicates).
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { provisionBusinessStarterKit } from "@/modules/platform/infrastructure/provision-business";
import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { createAppLogger } from "@/shared/infrastructure/logging/create-app-logger";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { createNumberSequenceRepository } from "../factories/create-number-sequence.repository";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const ORG = randomUUID();
const TABLES = ["document_sequences", "accounts", "units_of_measure", "expense_categories", "company_settings"];

beforeAll(async () => {
  await admin.connect();
  const slug = `numbers-${ORG.slice(0, 8)}`;
  await admin.query(`INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $2, now())`, [ORG, slug]);
  await provisionBusinessStarterKit(prisma, ORG, { companyName: "Numbers", timezone: "Asia/Karachi" });
});

afterAll(async () => {
  for (const table of TABLES) {
    await admin.query(`DELETE FROM ${table} WHERE "organizationId" = $1`, [ORG]);
  }
  await admin.query(`DELETE FROM organizations WHERE id = $1`, [ORG]);
  await admin.end();
  await prisma.$disconnect();
});

describe("document numbers", () => {
  it("gives ten people saving at once ten different numbers, in order", async () => {
    const repository = createNumberSequenceRepository({ prisma: prisma as never, logger: createAppLogger() });
    await runInOrganization(ORG, () => repository.generateNextNumber("RENTAL_ORDER"));

    const results = await runInOrganization(ORG, () =>
      Promise.all(Array.from({ length: 10 }, () => repository.generateNextNumber("RENTAL_ORDER"))),
    );

    const numbers = results.map((result) => result.number).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(10);
    expect(numbers.at(-1)! - numbers[0]!).toBe(9);
    expect(new Set(results.map((result) => result.formattedNumber)).size).toBe(10);
  });
});
