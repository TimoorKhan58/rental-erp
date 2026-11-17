import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_SEQUENCE_STARTING_NUMBER, DOCUMENT_TYPE_PREFIXES } from "@/modules/settings/domain/number-sequence.constants";
import { BOOTSTRAP_COMPANY_SETTINGS } from "@/modules/settings/domain/settings.constants";
import type { CreateSettingsData } from "@/modules/settings/domain/settings.types";
import { toSettingsCreateInput } from "@/modules/settings/infrastructure/mappers/settings.persistence.mapper";
import { runInOrganization } from "@/shared/infrastructure/tenancy/organization-scope";
import { runTenantTransaction } from "@/shared/infrastructure/tenancy/rls-session";

import {
  STARTER_ACCOUNTS,
  STARTER_DOCUMENT_TYPES,
  STARTER_EXPENSE_CATEGORIES,
  STARTER_UNITS_OF_MEASURE,
  evaluateBusinessSetup,
  type BusinessSetupStatus,
} from "../domain/business-starter-kit";

/** Matches the padding of sequences created on first use. */
const STARTER_SEQUENCE_PADDING = 5;

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type BusinessProfile = Partial<
  Pick<
    CreateSettingsData,
    "companyName" | "businessName" | "currencyCode" | "currencySymbol" | "timezone" | "phone" | "email"
  >
>;

export type StarterKitResult = {
  readonly companyProfileCreated: boolean;
  readonly documentSequencesCreated: number;
  readonly accountsCreated: number;
  readonly unitsOfMeasureCreated: number;
  readonly expenseCategoriesCreated: number;
};

/**
 * Gives a business everything it needs to run (SaaS phase 3a): company
 * profile, numbering for every document type, the standard chart of
 * accounts, units of measure and expense categories.
 *
 * Safe to run again: it never changes existing rows. Numbering and the
 * default accounts (needed for automatic bookkeeping) are filled in when
 * missing; units and expense categories only when the business has none. `tx` must already be scoped to the business (use
 * provisionBusinessStarterKit, or call this inside a larger business
 * creation transaction).
 */
export async function applyBusinessStarterKit(tx: Tx, profile: BusinessProfile = {}): Promise<StarterKitResult> {
  let companyProfileCreated = false;
  let settings = await tx.companySetting.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (settings === null) {
    const companyName = profile.companyName ?? BOOTSTRAP_COMPANY_SETTINGS.companyName;
    settings = await tx.companySetting.create({
      data: toSettingsCreateInput({
        ...BOOTSTRAP_COMPANY_SETTINGS,
        ...profile,
        companyName,
        businessName: profile.businessName ?? companyName,
      }),
      select: { id: true },
    });
    companyProfileCreated = true;
  }

  const existingTypes = new Set(
    (
      await tx.documentSequence.findMany({
        where: { companySettingId: settings.id },
        select: { documentType: true },
      })
    ).map((row) => row.documentType as string),
  );
  const sequences = await tx.documentSequence.createMany({
    data: STARTER_DOCUMENT_TYPES.filter((type) => !existingTypes.has(type)).map((documentType) => ({
      companySettingId: settings.id,
      documentType,
      prefix: DOCUMENT_TYPE_PREFIXES[documentType],
      startingNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
      currentNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
      paddingLength: STARTER_SEQUENCE_PADDING,
    })),
    skipDuplicates: true,
  });

  const accounts = await tx.account.createMany({
    data: STARTER_ACCOUNTS.map((account) => ({ ...account, isActive: true })),
    skipDuplicates: true,
  });
  // Units and expense categories are only a starting suggestion: a business
  // that already has its own list (e.g. replaced DAY with MTR) keeps it.
  const units =
    (await tx.unitOfMeasure.count()) > 0
      ? { count: 0 }
      : await tx.unitOfMeasure.createMany({
          data: STARTER_UNITS_OF_MEASURE.map((unit) => ({ ...unit, isActive: true })),
          skipDuplicates: true,
        });
  const categories =
    (await tx.expenseCategory.count()) > 0
      ? { count: 0 }
      : await tx.expenseCategory.createMany({
          data: STARTER_EXPENSE_CATEGORIES.map((category) => ({ ...category, isActive: true })),
          skipDuplicates: true,
        });

  return {
    companyProfileCreated,
    documentSequencesCreated: sequences.count,
    accountsCreated: accounts.count,
    unitsOfMeasureCreated: units.count,
    expenseCategoriesCreated: categories.count,
  };
}

export function provisionBusinessStarterKit(
  prisma: PrismaClient,
  organizationId: string,
  profile: BusinessProfile = {},
): Promise<StarterKitResult> {
  return runInOrganization(organizationId, () =>
    runTenantTransaction(prisma, (tx: Tx) => applyBusinessStarterKit(tx, profile)),
  );
}

/** Reports what a business is still missing (read-only). */
export function getBusinessSetupStatus(
  prisma: PrismaClient,
  organizationId: string,
): Promise<BusinessSetupStatus> {
  return runInOrganization(organizationId, async () => {
    const settings = await prisma.companySetting.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const [sequences, accounts, unitsOfMeasure, expenseCategories] = await Promise.all([
      settings
        ? prisma.documentSequence.findMany({
            where: { companySettingId: settings.id },
            select: { documentType: true },
          })
        : Promise.resolve([]),
      prisma.account.findMany({ where: { isActive: true }, select: { accountCode: true } }),
      prisma.unitOfMeasure.count({ where: { isActive: true } }),
      prisma.expenseCategory.count({ where: { isActive: true } }),
    ]);

    return evaluateBusinessSetup({
      hasActiveCompanyProfile: settings !== null,
      documentTypes: sequences.map((row) => row.documentType as string),
      activeAccountCodes: accounts.map((row) => row.accountCode),
      unitsOfMeasure,
      expenseCategories,
    });
  });
}
