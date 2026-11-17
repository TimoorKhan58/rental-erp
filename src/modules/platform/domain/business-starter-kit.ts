import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/modules/expense/domain/default-expense-categories";
import { DOCUMENT_TYPE_PREFIXES } from "@/modules/settings/domain/number-sequence.constants";

/**
 * The standard data every business starts with (SaaS phase 3a). The seed
 * (prisma/seed-data.ts) gives MT Service the same lists with fixed ids.
 */

export const STARTER_ACCOUNTS = [
  {
    accountCode: DEFAULT_ACCOUNT_CODES.CASH,
    name: "Cash",
    accountType: "ASSET",
    description: "Primary cash / bank account",
  },
  {
    accountCode: DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    name: "Accounts Receivable",
    accountType: "ASSET",
    description: "Customer rental invoice balances",
  },
  {
    accountCode: DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
    name: "Rental Revenue",
    accountType: "INCOME",
    description: "Rental income from issued invoices",
  },
  {
    accountCode: DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE,
    name: "General Expense",
    accountType: "EXPENSE",
    description: "Operating expenses paid through the expense module",
  },
] as const;

export const STARTER_UNITS_OF_MEASURE = [
  { code: "PCS", name: "Pieces", description: "Individual items" },
  { code: "SET", name: "Set", description: "Grouped item set" },
  { code: "DAY", name: "Day", description: "Rental day unit" },
] as const;

export const STARTER_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES.map(
  ({ name, description }) => ({ name, description }),
);

/** Every document type gets its numbering sequence up front. */
export const STARTER_DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_PREFIXES) as Array<
  keyof typeof DOCUMENT_TYPE_PREFIXES
>;

/** What a business needs before it can run a full rental with bookkeeping. */
export type BusinessSetupStatus = {
  readonly hasActiveCompanyProfile: boolean;
  readonly missingDocumentTypes: readonly string[];
  readonly missingDefaultAccounts: readonly string[];
  readonly unitsOfMeasure: number;
  readonly expenseCategories: number;
  readonly ready: boolean;
};

export function evaluateBusinessSetup(input: {
  readonly hasActiveCompanyProfile: boolean;
  readonly documentTypes: readonly string[];
  readonly activeAccountCodes: readonly string[];
  readonly unitsOfMeasure: number;
  readonly expenseCategories: number;
}): BusinessSetupStatus {
  const missingDocumentTypes = STARTER_DOCUMENT_TYPES.filter(
    (type) => !input.documentTypes.includes(type),
  );
  const missingDefaultAccounts = Object.values(DEFAULT_ACCOUNT_CODES).filter(
    (code) => !input.activeAccountCodes.includes(code),
  );

  return {
    hasActiveCompanyProfile: input.hasActiveCompanyProfile,
    missingDocumentTypes,
    missingDefaultAccounts,
    unitsOfMeasure: input.unitsOfMeasure,
    expenseCategories: input.expenseCategories,
    ready:
      input.hasActiveCompanyProfile &&
      missingDocumentTypes.length === 0 &&
      missingDefaultAccounts.length === 0 &&
      input.unitsOfMeasure > 0,
  };
}
