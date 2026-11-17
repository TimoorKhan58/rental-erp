/**
 * Business starter kit against a real PostgreSQL (SaaS phase 3a).
 * Run with `npm run test:db` and a migrated, disposable DATABASE_URL.
 */
import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/shared/infrastructure/database/prisma-client";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";

import { STARTER_DOCUMENT_TYPES, STARTER_EXPENSE_CATEGORIES } from "../domain/business-starter-kit";
import { getBusinessSetupStatus, provisionBusinessStarterKit } from "./provision-business";

const prisma = createPrismaClient();
const admin = new Client({ connectionString: process.env.DATABASE_URL });
const ORG = randomUUID();
const OTHER = randomUUID();
const run = randomUUID().slice(0, 8);

const TABLES = ["document_sequences", "accounts", "units_of_measure", "expense_categories", "company_settings"];

beforeAll(async () => {
  await admin.connect();
  for (const [id, slug] of [
    [ORG, `kit-${run}`],
    [OTHER, `kit-other-${run}`],
  ]) {
    await admin.query(
      `INSERT INTO organizations (id, name, slug, "updatedAt") VALUES ($1, $2, $3, now())`,
      [id, `Starter ${slug}`, slug],
    );
  }
});

afterAll(async () => {
  for (const table of TABLES) {
    await admin.query(`DELETE FROM ${table} WHERE "organizationId" = ANY($1::uuid[])`, [[ORG, OTHER]]);
  }
  await admin.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [[ORG, OTHER]]);
  await admin.end();
  await prisma.$disconnect();
});

describe("business starter kit", () => {
  it("reports a brand-new business as not ready", async () => {
    const status = await getBusinessSetupStatus(prisma, ORG);
    expect(status.ready).toBe(false);
    expect(status.hasActiveCompanyProfile).toBe(false);
    expect(status.missingDefaultAccounts).toHaveLength(4);
  });

  it("makes the business ready", async () => {
    const result = await provisionBusinessStarterKit(prisma, ORG, {
      companyName: "Starter Tents",
      currencyCode: "PKR",
    });

    expect(result).toEqual({
      companyProfileCreated: true,
      documentSequencesCreated: STARTER_DOCUMENT_TYPES.length,
      accountsCreated: 4,
      unitsOfMeasureCreated: 3,
      expenseCategoriesCreated: STARTER_EXPENSE_CATEGORIES.length,
    });
    expect((await getBusinessSetupStatus(prisma, ORG)).ready).toBe(true);

    const { rows } = await admin.query(
      `SELECT "companyName", "currencyCode" FROM company_settings WHERE "organizationId" = $1`,
      [ORG],
    );
    expect(rows).toEqual([{ companyName: "Starter Tents", currencyCode: "PKR" }]);
  });

  it("adds nothing when run again", async () => {
    expect(await provisionBusinessStarterKit(prisma, ORG)).toEqual({
      companyProfileCreated: false,
      documentSequencesCreated: 0,
      accountsCreated: 0,
      unitsOfMeasureCreated: 0,
      expenseCategoriesCreated: 0,
    });
  });

  it("starts the business's numbering at 1, separately from other businesses", async () => {
    await provisionBusinessStarterKit(prisma, OTHER);
    const { rows } = await admin.query(
      `SELECT "organizationId", "currentNumber" FROM document_sequences
       WHERE "documentType" = 'RENTAL_ORDER' AND "organizationId" = ANY($1::uuid[])`,
      [[ORG, OTHER]],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.currentNumber === 1)).toBe(true);
  });

  it("leaves a business's own units and expense categories alone", async () => {
    await admin.query(`DELETE FROM units_of_measure WHERE "organizationId" = $1 AND code <> 'PCS'`, [ORG]);
    await admin.query(`DELETE FROM expense_categories WHERE "organizationId" = $1 AND name <> 'Fuel'`, [ORG]);

    const result = await provisionBusinessStarterKit(prisma, ORG);

    expect(result.unitsOfMeasureCreated).toBe(0);
    expect(result.expenseCategoriesCreated).toBe(0);
  });

  it("keeps each business's starter data to itself", async () => {
    const accounts = await runInOrganization(ORG, () => prisma.account.count());
    expect(accounts).toBe(4);
  });

  it("allows only one active company profile per business", async () => {
    await expect(
      admin.query(
        `INSERT INTO company_settings (id, "organizationId", "companyName", "businessName", phone, email, address, city, province, country,
           "currencyCode", "currencySymbol", timezone, language, "dateFormat", "timeFormat", "numberFormat", "defaultRentalDays",
           "defaultTaxPercentage", "isActive", "updatedAt")
         VALUES ($1, $2, 'Second', 'Second', '0', 'a@b.c', 'x', 'x', 'x', 'x', 'PKR', 'Rs', 'Asia/Karachi', 'en', 'DD/MM/YYYY', 'HH:mm',
           '#,##0.00', 3, 0, true, now())`,
        [randomUUID(), ORG],
      ),
    ).rejects.toThrow(/company_settings_one_active_per_organization/);
  });
});
