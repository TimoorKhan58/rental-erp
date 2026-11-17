/**
 * Gives a business its starter kit (SaaS phase 3a): company profile,
 * numbering for every document type, the standard chart of accounts, units
 * of measure and expense categories. Only adds what is missing; existing
 * data is never changed, so it is safe to run again.
 *
 * Usage (from rental-erp/):
 *   BUSINESS=test-tents-b npm run business:provision
 *   BUSINESS=all          npm run business:provision   # every business
 *   CHECK_ONLY=1 BUSINESS=all npm run business:provision # report only
 */
import "dotenv/config";

import {
  getBusinessSetupStatus,
  provisionBusinessStarterKit,
} from "../src/modules/platform/infrastructure/provision-business";
import { createPrismaClient } from "../src/shared/infrastructure/database/prisma-client";
import { runAsSystem } from "../src/shared/infrastructure/tenancy/organization-scope";

async function main(): Promise<void> {
  const target = process.env.BUSINESS?.trim();
  const checkOnly = process.env.CHECK_ONLY === "1";

  if (!target) {
    throw new Error('Set BUSINESS to a business slug, or "all".');
  }

  const prisma = createPrismaClient();

  try {
    const businesses = await runAsSystem("provision-business script", () =>
      prisma.organization.findMany({
        where: target === "all" ? undefined : { slug: target },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "asc" },
      }),
    );

    if (businesses.length === 0) {
      throw new Error(`No business with slug "${target}".`);
    }

    let notReady = 0;

    for (const business of businesses) {
      console.log(`\n${business.name} (${business.slug})`);

      if (!checkOnly) {
        const result = await provisionBusinessStarterKit(prisma, business.id, {
          companyName: business.name,
        });
        console.log(
          `  added: company profile ${result.companyProfileCreated ? "yes" : "no (exists)"}, ` +
            `numbering ${result.documentSequencesCreated}, accounts ${result.accountsCreated}, ` +
            `units ${result.unitsOfMeasureCreated}, expense categories ${result.expenseCategoriesCreated}`,
        );
      }

      const status = await getBusinessSetupStatus(prisma, business.id);
      if (!status.ready) notReady += 1;
      console.log(
        `  ready: ${status.ready ? "yes" : "NO"}` +
          (status.hasActiveCompanyProfile ? "" : " | no company profile") +
          (status.missingDefaultAccounts.length ? ` | missing accounts ${status.missingDefaultAccounts.join(", ")}` : "") +
          (status.missingDocumentTypes.length ? ` | missing numbering ${status.missingDocumentTypes.join(", ")}` : "") +
          (status.unitsOfMeasure === 0 ? " | no units of measure" : ""),
      );
    }

    if (notReady > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
